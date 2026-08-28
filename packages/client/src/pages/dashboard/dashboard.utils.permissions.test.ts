import { describe, it, expect } from 'vitest';
import { canAccessRoute } from './dashboard.utils';

// Regression coverage for the drift found during Phase 5.3's grep sweep:
// this table previously classified /traductions as admin-only, out of
// sync with the actual route guard (TRANSLATION_VIEW, operateur+, set in
// router.tsx Phase 5.1). Fixed to read per-route capability instead of a
// role === 'admin' check.
describe('canAccessRoute - quick-action link visibility matches the real route guards', () => {
  it('/traductions is reachable by operateur, not just admin+ (the drift that was fixed)', () => {
    expect(canAccessRoute('operateur', '/traductions')).toBe(true);
    expect(canAccessRoute('agent', '/traductions')).toBe(false);
  });

  it('/accords, /courriers, /missions stay admin+ only', () => {
    for (const href of ['/accords/new', '/courriers/new', '/missions/new']) {
      expect(canAccessRoute('operateur', href)).toBe(false);
      expect(canAccessRoute('admin', href)).toBe(true);
    }
  });

  it('/analytics stays admin+ only', () => {
    expect(canAccessRoute('operateur', '/analytics')).toBe(false);
    expect(canAccessRoute('admin', '/analytics')).toBe(true);
  });

  it('an unlisted route (e.g. /documents) is always reachable', () => {
    expect(canAccessRoute('agent', '/documents')).toBe(true);
    expect(canAccessRoute(undefined, '/documents')).toBe(true);
  });

  it('undefined role denies every gated route', () => {
    expect(canAccessRoute(undefined, '/accords/new')).toBe(false);
  });

  // Phase 10.7 alignment fix: '/accords/new', '/courriers/new', '/missions/new'
  // now resolve through their own AGREEMENT_MANAGE/CORRESPONDENCE_MANAGE/
  // MISSION_MANAGE entries instead of falling through to the view-tier
  // prefix (AGREEMENT_VIEW/CORRESPONDENCE_VIEW/MISSION_REGISTRY_VIEW) -
  // not observable behaviorally today since both tiers are admin+-only,
  // but a detail href (no /new suffix) must still fall through to the
  // general view-tier entry, proving the specific-prefix match doesn't
  // swallow unrelated routes under the same module.
  it('a detail href (no /new suffix) still resolves through the general view-tier entry', () => {
    for (const href of ['/accords/42', '/courriers/42', '/missions/42']) {
      expect(canAccessRoute('admin', href)).toBe(true);
      expect(canAccessRoute(undefined, href)).toBe(false);
    }
  });
});
