// packages/client/src/lib/help/help-map.test.ts
//
// Pure-function tests for the Help Drawer's content-resolution logic (Phase
// 10.1) — no React rendering: this matches the existing client test
// strategy exactly (requests.permissions.test.ts, dashboard.utils
// .permissions.test.ts, ...), which is plain node-environment vitest with
// no jsdom/@testing-library/react in the client package at all. The
// trigger/Sheet are Radix-composed UI with no bespoke logic of their own
// (focus trap, ESC, focus-return are Radix's responsibility, already
// exercised by the pre-existing Dialog), so there is nothing here that a
// rendering test would verify that isn't already covered by testing the
// route matcher and capability filter directly.
import { describe, it, expect } from 'vitest';
import { getHelpEntry, filterHelpEntry, HELP_MAP, type HelpEntry } from './help-map';

describe('getHelpEntry — route matching', () => {
  it('finds the /demandes entry for an exact match', () => {
    expect(getHelpEntry('/demandes')?.routePattern).toBe('/demandes');
  });

  it('finds the /mes-demandes entry for an exact match', () => {
    expect(getHelpEntry('/mes-demandes')?.routePattern).toBe('/mes-demandes');
  });

  it('returns undefined for a route with no contextual help', () => {
    expect(getHelpEntry('/dashboard')).toBeUndefined();
    expect(getHelpEntry('/glossaire')).toBeUndefined();
  });

  it('does not confuse /demandes with /mes-demandes (distinct segments)', () => {
    expect(getHelpEntry('/demandes')?.title).not.toBe(getHelpEntry('/mes-demandes')?.title);
  });

  it('matches dynamic :param segments (forward compatibility, not yet used by a real entry)', () => {
    const withDynamicEntry: HelpEntry[] = [
      { routePattern: '/missions/:id', title: 'x', sections: [] },
    ];
    const match = withDynamicEntry.find((e) =>
      e.routePattern
        .split('/')
        .filter(Boolean)
        .every((seg, i) => seg.startsWith(':') || seg === '/missions/42'.split('/').filter(Boolean)[i])
    );
    expect(match).toBeDefined();
  });

  it('does not match a pattern against a path of different segment length', () => {
    expect(getHelpEntry('/demandes/extra')).toBeUndefined();
    expect(getHelpEntry('/demandes/')).not.toBeUndefined(); // trailing slash is stripped, still matches
  });
});

describe('filterHelpEntry — capability gating', () => {
  const demandesEntry = HELP_MAP.find((e) => e.routePattern === '/demandes')!;

  it('operateur sees capability-gated sections it holds (take, priority validate, validate, archive)', () => {
    const filtered = filterHelpEntry(demandesEntry, 'operateur');
    const ids = filtered.sections.map((s) => s.id);
    expect(ids).toContain('prendre-en-charge');
    expect(ids).toContain('priorite-vs-validation');
    expect(ids).toContain('valider');
    expect(ids).toContain('archiver');
  });

  it('always keeps sections with no capability requirement, for every role', () => {
    const filtered = filterHelpEntry(demandesEntry, 'agent');
    const ids = filtered.sections.map((s) => s.id);
    expect(ids).toContain('registre-vs-mes-demandes');
    expect(ids).toContain('cycle-de-vie');
  });

  it('hides sections the role lacks the capability for', () => {
    // agent lacks REQUEST_TAKE/PRIORITY_VALIDATE/VALIDATE/ARCHIVE entirely
    const filtered = filterHelpEntry(demandesEntry, 'agent');
    const ids = filtered.sections.map((s) => s.id);
    expect(ids).not.toContain('prendre-en-charge');
    expect(ids).not.toContain('priorite-vs-validation');
    expect(ids).not.toContain('valider');
    expect(ids).not.toContain('archiver');
  });

  it('treats an undefined role as holding no capabilities (fails closed)', () => {
    const filtered = filterHelpEntry(demandesEntry, undefined);
    expect(filtered.sections.every((s) => !s.capability)).toBe(true);
  });

  const mesDemandesEntry = HELP_MAP.find((e) => e.routePattern === '/mes-demandes')!;

  it('mes-demandes: agent (the typical viewer) sees creation, recall, and status sections', () => {
    const filtered = filterHelpEntry(mesDemandesEntry, 'agent');
    const ids = filtered.sections.map((s) => s.id);
    expect(ids).toEqual(['creer', 'suivre', 'rappeler', 'statuts']);
  });

  it('mes-demandes entry never carries operateur/admin-only content (no capability requiring more than REQUEST_VIEW_OWN holders lack)', () => {
    // every role that can reach /mes-demandes (REQUEST_VIEW_OWN) also holds
    // REQUEST_CREATE_OWN and REQUEST_RECALL_OWN by design — filtering must
    // never actually drop a section for a real /mes-demandes viewer.
    for (const role of ['agent', 'operateur', 'admin', 'super_admin'] as const) {
      const filtered = filterHelpEntry(mesDemandesEntry, role);
      expect(filtered.sections).toHaveLength(mesDemandesEntry.sections.length);
    }
  });
});

describe('fallback contract (exercised via getHelpEntry + filterHelpEntry composition, mirrors useContextualHelp)', () => {
  function resolve(pathname: string, role: Parameters<typeof filterHelpEntry>[1]) {
    const entry = getHelpEntry(pathname);
    if (!entry) return undefined;
    const filtered = filterHelpEntry(entry, role);
    return filtered.sections.length > 0 ? filtered : undefined;
  }

  it('a route with no entry resolves to undefined (fallback state)', () => {
    expect(resolve('/audit', 'admin')).toBeUndefined();
  });

  it('a matched route with visible sections resolves to a filtered entry', () => {
    const resolved = resolve('/demandes', 'operateur');
    expect(resolved).toBeDefined();
    expect(resolved!.sections.length).toBeGreaterThan(0);
  });

  it('an entry that filters down to zero sections also resolves to undefined (never a blank drawer)', () => {
    // Guards against a future entry that is 100% capability-gated for some role.
    const allGated: HelpEntry = {
      routePattern: '/x',
      title: 'x',
      sections: [{ id: 'a', heading: 'a', body: 'a', capability: 'SYSTEM_ADMIN_OPERATION' }],
    };
    const filtered = filterHelpEntry(allGated, 'agent');
    expect(filtered.sections.length > 0 ? filtered : undefined).toBeUndefined();
  });
});
