import { describe, it, expect } from 'vitest';
import { canManageAccords } from './accord.permissions';

describe('canManageAccords - AGREEMENT_MANAGE, mirrors accords.route.ts mutation gate', () => {
  it('admin+ can manage (AGREEMENT_MANAGE is bundled with AGREEMENT_VIEW at the admin tier today)', () => {
    expect(canManageAccords('admin')).toBe(true);
    expect(canManageAccords('super_admin')).toBe(true);
  });

  it('operateur cannot manage (also lacks AGREEMENT_VIEW, so never reaches /accords)', () => {
    expect(canManageAccords('operateur')).toBe(false);
  });

  it('agent cannot manage', () => {
    expect(canManageAccords('agent')).toBe(false);
  });

  it('undefined role denies', () => {
    expect(canManageAccords(undefined)).toBe(false);
  });
});
