// packages/client/src/lib/help/help-map.test.ts
//
// Pure-function tests for the Help Drawer's content-resolution logic
// (Phase 10.1: /demandes, /mes-demandes; Phase 10.2: /traductions,
// /traductions/:id, /mes-missions, /missions, /missions/:id) - no React
// rendering: this matches the existing client test strategy exactly
// (requests.permissions.test.ts, dashboard.utils.permissions.test.ts, ...),
// which is plain node-environment vitest with no jsdom/@testing-library/react
// in the client package at all. The trigger/Sheet are Radix-composed UI with
// no bespoke logic of their own (focus trap, ESC, focus-return are Radix's
// responsibility, already exercised by the pre-existing Dialog), so there is
// nothing here that a rendering test would verify that isn't already covered
// by testing the route matcher and capability filter directly.
import { describe, it, expect } from 'vitest';
import { getHelpEntry, filterHelpEntry, HELP_MAP, type HelpEntry } from './help-map';
import { getArticleBySlug, getVisibleArticleBySlug } from '@/lib/docs/articles';

describe('HELP_MAP articles - every drawer article link resolves to a real, known slug (Phase 10.3)', () => {
  it('every entry.articles slug exists in the article registry', () => {
    for (const entry of HELP_MAP) {
      for (const slug of entry.articles ?? []) {
        expect(
          getArticleBySlug(slug),
          `${entry.routePattern} links to unknown slug "${slug}"`
        ).toBeDefined();
      }
    }
  });

  it('the five Phase 10.3-required routes are wired to at least one article', () => {
    for (const route of [
      '/demandes',
      '/mes-demandes',
      '/traductions',
      '/traductions/:id',
      '/mes-missions',
    ]) {
      const entry = HELP_MAP.find((e) => e.routePattern === route);
      expect(entry?.articles?.length ?? 0, `${route} has no linked article`).toBeGreaterThan(0);
    }
  });
});

describe('getHelpEntry - route matching', () => {
  it('finds the /demandes entry for an exact match', () => {
    expect(getHelpEntry('/demandes')?.routePattern).toBe('/demandes');
  });

  it('finds the /mes-demandes entry for an exact match', () => {
    expect(getHelpEntry('/mes-demandes')?.routePattern).toBe('/mes-demandes');
  });

  it('returns undefined for a route with no contextual help', () => {
    expect(getHelpEntry('/dashboard')).toBeUndefined();
    expect(getHelpEntry('/portal')).toBeUndefined();
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
        .every(
          (seg, i) => seg.startsWith(':') || seg === '/missions/42'.split('/').filter(Boolean)[i]
        )
    );
    expect(match).toBeDefined();
  });

  it('does not match a pattern against a path of different segment length', () => {
    expect(getHelpEntry('/demandes/extra')).toBeUndefined();
    expect(getHelpEntry('/demandes/')).not.toBeUndefined(); // trailing slash is stripped, still matches
  });

  it('finds all five Phase 10.2 entries by exact route', () => {
    expect(getHelpEntry('/traductions')?.routePattern).toBe('/traductions');
    expect(getHelpEntry('/mes-missions')?.routePattern).toBe('/mes-missions');
    expect(getHelpEntry('/missions')?.routePattern).toBe('/missions');
  });

  it('matches /traductions/:id and /missions/:id against real ids (real dynamic-route entries, not a synthetic one)', () => {
    expect(getHelpEntry('/traductions/42')?.routePattern).toBe('/traductions/:id');
    expect(getHelpEntry('/missions/7')?.routePattern).toBe('/missions/:id');
  });

  it('does not confuse the registry route with its own :id sub-route', () => {
    expect(getHelpEntry('/traductions')?.routePattern).toBe('/traductions');
    expect(getHelpEntry('/traductions/42')?.routePattern).not.toBe('/traductions');
    expect(getHelpEntry('/missions')?.routePattern).toBe('/missions');
    expect(getHelpEntry('/missions/7')?.routePattern).not.toBe('/missions');
  });
});

describe('filterHelpEntry - capability gating', () => {
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
    // REQUEST_CREATE_OWN and REQUEST_RECALL_OWN by design - filtering must
    // never actually drop a section for a real /mes-demandes viewer.
    for (const role of ['agent', 'operateur', 'admin', 'super_admin'] as const) {
      const filtered = filterHelpEntry(mesDemandesEntry, role);
      expect(filtered.sections).toHaveLength(mesDemandesEntry.sections.length);
    }
  });
});

describe('/traductions and /traductions/:id - capability filtering of translation action sections', () => {
  const registryEntry = HELP_MAP.find((e) => e.routePattern === '/traductions')!;
  const detailEntry = HELP_MAP.find((e) => e.routePattern === '/traductions/:id')!;

  it('operateur+ (the only viewers today) see the process/approve/archive-gated sections', () => {
    for (const role of ['operateur', 'admin', 'super_admin'] as const) {
      const filteredRegistry = filterHelpEntry(registryEntry, role);
      expect(filteredRegistry.sections.map((s) => s.id)).toContain('traiter-relire-approuver');

      const filteredDetail = filterHelpEntry(detailEntry, role);
      const ids = filteredDetail.sections.map((s) => s.id);
      expect(ids).toContain('corriger');
      expect(ids).toContain('approuver');
      expect(ids).toContain('archiver');
    }
  });

  it('a TRANSLATION_VIEW-only viewer (agent, hypothetically) receives no process/approve/archive instructions', () => {
    // agent never actually reaches /traductions/:id today (route itself
    // requires TRANSLATION_VIEW, which agent lacks) - this exercises the
    // filter defensively, per the Phase 10.2 brief's explicit requirement.
    const filteredRegistry = filterHelpEntry(registryEntry, 'agent');
    expect(filteredRegistry.sections.map((s) => s.id)).not.toContain('traiter-relire-approuver');

    const filteredDetail = filterHelpEntry(detailEntry, 'agent');
    const ids = filteredDetail.sections.map((s) => s.id);
    expect(ids).not.toContain('corriger');
    expect(ids).not.toContain('approuver');
    expect(ids).not.toContain('archiver');
    // ungated, purely informational sections remain
    expect(ids).toContain('statut-et-actions');
    expect(ids).toContain('manuelle-requise');
  });
});

describe('/mes-missions - no admin/assignment instructions regardless of role', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/mes-missions')!;

  it('carries no capability-gated section at all', () => {
    expect(entry.sections.every((s) => !s.capability)).toBe(true);
  });

  it('content is identical for every role (agent through super_admin)', () => {
    for (const role of ['agent', 'operateur', 'admin', 'super_admin'] as const) {
      expect(filterHelpEntry(entry, role).sections).toHaveLength(entry.sections.length);
    }
  });
});

describe('/missions and /missions/:id - capability filtering of mission management sections', () => {
  const registryEntry = HELP_MAP.find((e) => e.routePattern === '/missions')!;
  const detailEntry = HELP_MAP.find((e) => e.routePattern === '/missions/:id')!;

  it('admin+ (the only viewers today) see MISSION_MANAGE and MISSION_RECOMMENDATION_MANAGE sections', () => {
    for (const role of ['admin', 'super_admin'] as const) {
      const filteredRegistry = filterHelpEntry(registryEntry, role);
      const registryIds = filteredRegistry.sections.map((s) => s.id);
      expect(registryIds).toContain('gestion');
      expect(registryIds).toContain('recommandations');
      expect(registryIds).toContain('responsable-rapport');

      const filteredDetail = filterHelpEntry(detailEntry, role);
      const detailIds = filteredDetail.sections.map((s) => s.id);
      expect(detailIds).toContain('participants');
      expect(detailIds).toContain('rapport-officiel');
      expect(detailIds).toContain('recommandations-detail');
    }
  });

  it('a view-only MISSION_REGISTRY_VIEW holder receives registry/navigation guidance but not mutation instructions', () => {
    // operateur lacks MISSION_REGISTRY_VIEW too (never reaches this route
    // today), used here purely as "holds none of the mission-management
    // capabilities" - exercises the filter the same way a hypothetical
    // future view-only role would.
    const filteredRegistry = filterHelpEntry(registryEntry, 'operateur');
    const registryIds = filteredRegistry.sections.map((s) => s.id);
    expect(registryIds).toContain('registre-global');
    expect(registryIds).toContain('vs-mes-missions');
    expect(registryIds).not.toContain('gestion');
    expect(registryIds).not.toContain('recommandations');
    expect(registryIds).not.toContain('responsable-rapport');

    const filteredDetail = filterHelpEntry(detailEntry, 'operateur');
    const detailIds = filteredDetail.sections.map((s) => s.id);
    expect(detailIds).toContain('sections');
    expect(detailIds).toContain('notifications-historique');
    expect(detailIds).not.toContain('participants');
    expect(detailIds).not.toContain('rapport-officiel');
    expect(detailIds).not.toContain('recommandations-detail');
  });
});

describe('/documents - document mutation-specific capability filtering (Phase 10.4)', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/documents')!;

  it('operateur+ sees upload/internal-visibility sections, not the admin-only portal one', () => {
    const filtered = filterHelpEntry(entry, 'operateur');
    const ids = filtered.sections.map((s) => s.id);
    expect(ids).toContain('deposer');
    expect(ids).toContain('visibilite-interne');
    expect(ids).toContain('ocr');
    expect(ids).toContain('suppression');
    expect(ids).not.toContain('publication-portail');
  });

  it('admin+ additionally sees the portal-publication section', () => {
    const filtered = filterHelpEntry(entry, 'admin');
    expect(filtered.sections.map((s) => s.id)).toContain('publication-portail');
  });

  it('a viewer with no document-management capability sees only the two general orientation sections', () => {
    // no live role reaches /documents without at least DOCUMENT_UPLOAD's
    // tier holding the rest too, but the filter itself must still fail
    // closed for a hypothetical view-only account.
    const filtered = filterHelpEntry(entry, undefined);
    expect(filtered.sections.map((s) => s.id)).toEqual(['a-quoi-sert', 'visibilite-variable']);
  });
});

describe('/glossaire - view-only filtering never receives management instructions (Phase 10.4)', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/glossaire')!;

  it('agent (hypothetically) sees only the general sections, never the management one', () => {
    const filtered = filterHelpEntry(entry, 'agent');
    const ids = filtered.sections.map((s) => s.id);
    expect(ids).toContain('a-quoi-sert');
    expect(ids).toContain('rechercher');
    expect(ids).not.toContain('gestion');
  });

  it('operateur+ (the only real viewers today) sees the management section too', () => {
    for (const role of ['operateur', 'admin', 'super_admin'] as const) {
      const filtered = filterHelpEntry(entry, role);
      expect(filtered.sections.map((s) => s.id)).toContain('gestion');
    }
  });
});

describe('/mon-espace - no role-name framing, identical content for every role (Phase 10.4)', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/mon-espace')!;

  it('carries no capability-gated section at all', () => {
    expect(entry.sections.every((s) => !s.capability)).toBe(true);
  });

  it('content is identical for every role', () => {
    for (const role of ['agent', 'operateur', 'admin', 'super_admin'] as const) {
      expect(filterHelpEntry(entry, role).sections).toHaveLength(entry.sections.length);
    }
  });

  it('does not use role-name language ("because you are an agent") anywhere in its copy', () => {
    const text = entry.sections.map((s) => `${s.heading} ${s.body}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/agent|op[ée]rateur|admin|super_admin/);
  });
});

describe('/accords and /accords/:id - view-only never receives AGREEMENT_MANAGE instructions (Phase 10.5)', () => {
  for (const pattern of ['/accords', '/accords/:id'] as const) {
    const entry = HELP_MAP.find((e) => e.routePattern === pattern)!;

    it(`${pattern}: operateur (AGREEMENT_VIEW-only, hypothetically) never sees a management section`, () => {
      const filtered = filterHelpEntry(entry, 'operateur');
      expect(filtered.sections.every((s) => !s.capability)).toBe(true);
    });

    it(`${pattern}: admin+ (the only real viewers today) sees the management sections`, () => {
      for (const role of ['admin', 'super_admin'] as const) {
        const filtered = filterHelpEntry(entry, role);
        expect(filtered.sections.some((s) => s.capability === 'AGREEMENT_MANAGE')).toBe(true);
      }
    });
  }
});

describe('/partenaires and /partenaires/:id - view-only never receives PARTNER_MANAGE instructions (Phase 10.5)', () => {
  for (const pattern of ['/partenaires', '/partenaires/:id'] as const) {
    const entry = HELP_MAP.find((e) => e.routePattern === pattern)!;

    it(`${pattern}: operateur (PARTNER_VIEW-only, hypothetically) never sees a management section`, () => {
      const filtered = filterHelpEntry(entry, 'operateur');
      expect(filtered.sections.every((s) => !s.capability)).toBe(true);
    });

    it(`${pattern}: admin+ (the only real viewers today) sees the management sections`, () => {
      for (const role of ['admin', 'super_admin'] as const) {
        const filtered = filterHelpEntry(entry, role);
        expect(filtered.sections.some((s) => s.capability === 'PARTNER_MANAGE')).toBe(true);
      }
    });
  }
});

describe('/courriers and /courriers/:id - view-only never receives CORRESPONDENCE_MANAGE instructions (Phase 10.5)', () => {
  for (const pattern of ['/courriers', '/courriers/:id'] as const) {
    const entry = HELP_MAP.find((e) => e.routePattern === pattern)!;

    it(`${pattern}: operateur (CORRESPONDENCE_VIEW-only, hypothetically) never sees a management section`, () => {
      const filtered = filterHelpEntry(entry, 'operateur');
      expect(filtered.sections.every((s) => !s.capability)).toBe(true);
    });

    it(`${pattern}: admin+ (the only real viewers today) sees the management sections`, () => {
      for (const role of ['admin', 'super_admin'] as const) {
        const filtered = filterHelpEntry(entry, role);
        expect(filtered.sections.some((s) => s.capability === 'CORRESPONDENCE_MANAGE')).toBe(true);
      }
    });
  }
});

describe('cooperation routes resolve for real routes (Phase 10.5)', () => {
  it('/accords, /partenaires, /courriers and their :id variants all have a help entry', () => {
    for (const route of [
      '/accords',
      '/accords/:id',
      '/partenaires',
      '/partenaires/:id',
      '/courriers',
      '/courriers/:id',
    ]) {
      expect(getHelpEntry(route), `${route} has no help entry`).toBeDefined();
    }
  });

  it('each cooperation entry links to at least one article', () => {
    for (const route of [
      '/accords',
      '/accords/:id',
      '/partenaires',
      '/partenaires/:id',
      '/courriers',
      '/courriers/:id',
    ]) {
      const entry = getHelpEntry(route)!;
      expect(entry.articles?.length ?? 0, `${route} has no linked article`).toBeGreaterThan(0);
    }
  });
});

describe('cooperation Help Drawer links never expose an inaccessible article (Phase 10.5, mirrors HelpDrawer.tsx\'s getVisibleArticleBySlug resolution)', () => {
  const routeToSlug: Record<string, string> = {
    '/accords': 'gerer-suivre-accords',
    '/accords/:id': 'gerer-suivre-accords',
    '/partenaires': 'gerer-partenaires',
    '/partenaires/:id': 'gerer-partenaires',
    '/courriers': 'suivre-courriers',
    '/courriers/:id': 'suivre-courriers',
  };

  it('agent/operateur resolve no linked article for any cooperation route (same rule the drawer applies)', () => {
    for (const [route, slug] of Object.entries(routeToSlug)) {
      const entry = getHelpEntry(route)!;
      expect(entry.articles).toContain(slug);
      for (const role of ['agent', 'operateur'] as const) {
        const resolved = (entry.articles ?? [])
          .map((s) => getVisibleArticleBySlug(s, role))
          .filter((a): a is NonNullable<typeof a> => Boolean(a));
        expect(resolved.map((a) => a.slug)).not.toContain(slug);
      }
    }
  });

  it('admin+ resolves the linked article for every cooperation route', () => {
    for (const [route, slug] of Object.entries(routeToSlug)) {
      const entry = getHelpEntry(route)!;
      for (const role of ['admin', 'super_admin'] as const) {
        const resolved = (entry.articles ?? [])
          .map((s) => getVisibleArticleBySlug(s, role))
          .filter((a): a is NonNullable<typeof a> => Boolean(a));
        expect(resolved.map((a) => a.slug)).toContain(slug);
      }
    }
  });
});

describe('/utilisateurs - entire page requires USER_MANAGE, no separate view-only tier exists today (Phase 10.6)', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/utilisateurs')!;

  it('carries no capability-gated section - the whole route already requires USER_MANAGE to be reached', () => {
    expect(entry.sections.every((s) => !s.capability)).toBe(true);
  });

  it('resolves for admin+ (the only roles reaching this route today)', () => {
    for (const role of ['admin', 'super_admin'] as const) {
      expect(filterHelpEntry(entry, role).sections.length).toBe(entry.sections.length);
    }
  });
});

describe('/admin - settings read/write and JOB_EXECUTE distinction (Phase 10.6)', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/admin')!;

  it('the parameters section is ungated (visible to every real viewer, matching the route\'s own SYSTEM_SETTINGS_VIEW gate)', () => {
    const parametres = entry.sections.find((s) => s.id === 'parametres')!;
    expect(parametres.capability).toBeUndefined();
  });

  it('the jobs section requires JOB_EXECUTE specifically, distinct from the page\'s own SYSTEM_SETTINGS_VIEW gate', () => {
    const jobs = entry.sections.find((s) => s.id === 'jobs')!;
    expect(jobs.capability).toBe('JOB_EXECUTE');
  });

  it('admin+ (who all hold JOB_EXECUTE) sees both sections', () => {
    for (const role of ['admin', 'super_admin'] as const) {
      const filtered = filterHelpEntry(entry, role);
      expect(filtered.sections.map((s) => s.id)).toEqual(['parametres', 'jobs']);
    }
  });
});

describe('/audit - read-only journal, no mutation-specific section exists (Phase 10.6)', () => {
  const entry = HELP_MAP.find((e) => e.routePattern === '/audit')!;

  it('carries no capability-gated section - nothing beyond AUDIT_VIEW (the route\'s own gate) governs this page', () => {
    expect(entry.sections.every((s) => !s.capability)).toBe(true);
  });

  it('never implies records can be altered or deleted', () => {
    const text = entry.sections.map((s) => `${s.heading} ${s.body}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/modifier une entrée|supprimer une entrée|annuler une action/);
  });
});

describe('administration routes resolve and link only to accessible articles (Phase 10.6)', () => {
  it('/utilisateurs, /admin, /audit all have a help entry with at least one linked article', () => {
    for (const route of ['/utilisateurs', '/admin', '/audit']) {
      const entry = getHelpEntry(route);
      expect(entry, `${route} has no help entry`).toBeDefined();
      expect(entry!.articles?.length ?? 0, `${route} has no linked article`).toBeGreaterThan(0);
    }
  });

  it('agent/operateur resolve no linked article for any administration route (mirrors HelpDrawer.tsx)', () => {
    for (const route of ['/utilisateurs', '/admin', '/audit']) {
      const entry = getHelpEntry(route)!;
      for (const role of ['agent', 'operateur'] as const) {
        const resolved = (entry.articles ?? [])
          .map((slug) => getVisibleArticleBySlug(slug, role))
          .filter((a): a is NonNullable<typeof a> => Boolean(a));
        expect(resolved).toHaveLength(0);
      }
    }
  });

  it('admin+ resolves every linked article for every administration route', () => {
    for (const route of ['/utilisateurs', '/admin', '/audit']) {
      const entry = getHelpEntry(route)!;
      for (const role of ['admin', 'super_admin'] as const) {
        const resolved = (entry.articles ?? [])
          .map((slug) => getVisibleArticleBySlug(slug, role))
          .filter((a): a is NonNullable<typeof a> => Boolean(a));
        expect(resolved).toHaveLength(entry.articles?.length ?? 0);
      }
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
    expect(resolve('/portal', 'admin')).toBeUndefined();
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
