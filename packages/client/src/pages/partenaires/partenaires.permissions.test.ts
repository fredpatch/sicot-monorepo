import { describe, it, expect } from 'vitest';
import { canManagePartenaires } from './partenaires.permissions';

describe('canManagePartenaires - PARTNER_MANAGE, mirrors organisations.route.ts mutation gate', () => {
  it('admin+ can manage (PARTNER_MANAGE is bundled with PARTNER_VIEW at the admin tier today)', () => {
    expect(canManagePartenaires('admin')).toBe(true);
    expect(canManagePartenaires('super_admin')).toBe(true);
  });

  it('operateur cannot manage (also lacks PARTNER_VIEW, so never reaches /partenaires)', () => {
    expect(canManagePartenaires('operateur')).toBe(false);
  });

  it('agent cannot manage', () => {
    expect(canManagePartenaires('agent')).toBe(false);
  });

  it('undefined role denies', () => {
    expect(canManagePartenaires(undefined)).toBe(false);
  });
});
