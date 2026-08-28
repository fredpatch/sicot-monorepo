// packages/client/src/pages/missions/missions.permissions.test.ts
import { describe, it, expect } from 'vitest';
import { canManageMission, canManageRecommendations } from './missions.permissions';

function user(role: string) {
  return { role: role as never };
}

describe('canManageMission - MISSION_MANAGE', () => {
  it('admin+ can manage', () => {
    expect(canManageMission(user('admin'))).toBe(true);
    expect(canManageMission(user('super_admin'))).toBe(true);
  });

  it('operateur/agent cannot (MISSION_MANAGE is admin+-only)', () => {
    expect(canManageMission(user('operateur'))).toBe(false);
    expect(canManageMission(user('agent'))).toBe(false);
  });

  it('no user denies', () => {
    expect(canManageMission(undefined)).toBe(false);
    expect(canManageMission(null)).toBe(false);
  });
});

describe('canManageRecommendations - MISSION_RECOMMENDATION_MANAGE', () => {
  it('admin+ can manage recommendations', () => {
    expect(canManageRecommendations(user('admin'))).toBe(true);
    expect(canManageRecommendations(user('super_admin'))).toBe(true);
  });

  it('operateur/agent cannot', () => {
    expect(canManageRecommendations(user('operateur'))).toBe(false);
    expect(canManageRecommendations(user('agent'))).toBe(false);
  });

  it('no user denies', () => {
    expect(canManageRecommendations(undefined)).toBe(false);
  });

  it('is a distinct capability from MISSION_MANAGE (both gate mission mutation controls independently per the route contract)', () => {
    // Both happen to be admin+-only today, so this just documents that the
    // two helpers are not aliases of one another, in case that ever changes.
    expect(canManageMission).not.toBe(canManageRecommendations);
  });
});
