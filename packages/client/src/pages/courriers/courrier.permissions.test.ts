import { describe, it, expect } from 'vitest';
import { canManageCourriers } from './courrier.permissions';

describe('canManageCourriers - CORRESPONDENCE_MANAGE, mirrors courriers.route.ts mutation gate', () => {
  it('admin+ can manage (CORRESPONDENCE_MANAGE is bundled with CORRESPONDENCE_VIEW at the admin tier today)', () => {
    expect(canManageCourriers('admin')).toBe(true);
    expect(canManageCourriers('super_admin')).toBe(true);
  });

  it('operateur cannot manage (also lacks CORRESPONDENCE_VIEW, so never reaches /courriers)', () => {
    expect(canManageCourriers('operateur')).toBe(false);
  });

  it('agent cannot manage', () => {
    expect(canManageCourriers('agent')).toBe(false);
  });

  it('undefined role denies', () => {
    expect(canManageCourriers(undefined)).toBe(false);
  });
});
