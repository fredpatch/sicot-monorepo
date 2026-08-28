import { describe, expect, it } from 'vitest';
import { TARGET_ROLES } from './roles';
import {
  ROLE_CAPABILITIES,
  hasCapability,
  hasAnyCapability,
  hasAllCapabilities,
} from './role-capabilities';
import type { Capability } from './capabilities';

describe('ROLE_CAPABILITIES shape', () => {
  it('defines a capability list for every role', () => {
    for (const role of TARGET_ROLES) {
      expect(Array.isArray(ROLE_CAPABILITIES[role])).toBe(true);
      expect(ROLE_CAPABILITIES[role].length).toBeGreaterThan(0);
    }
  });

  it('each tier is a strict superset of the one below it', () => {
    const isSuperset = (superset: readonly Capability[], subset: readonly Capability[]) =>
      subset.every((c) => superset.includes(c));

    expect(isSuperset(ROLE_CAPABILITIES.operateur, ROLE_CAPABILITIES.agent)).toBe(true);
    expect(isSuperset(ROLE_CAPABILITIES.admin, ROLE_CAPABILITIES.operateur)).toBe(true);
    expect(isSuperset(ROLE_CAPABILITIES.super_admin, ROLE_CAPABILITIES.admin)).toBe(true);

    // and strict: super_admin has at least one capability admin lacks
    expect(ROLE_CAPABILITIES.super_admin.length).toBeGreaterThan(ROLE_CAPABILITIES.admin.length);
  });

  it('has no duplicate capabilities within a role', () => {
    for (const role of TARGET_ROLES) {
      const list = ROLE_CAPABILITIES[role];
      expect(new Set(list).size).toBe(list.length);
    }
  });
});

describe('hasCapability', () => {
  it('agent has personal capabilities but not operational ones', () => {
    expect(hasCapability('agent', 'REQUEST_VIEW_OWN')).toBe(true);
    expect(hasCapability('agent', 'REQUEST_QUEUE_VIEW')).toBe(false);
    expect(hasCapability('agent', 'AGREEMENT_MANAGE')).toBe(false);
    expect(hasCapability('agent', 'USER_MANAGE')).toBe(false);
  });

  it('operateur has translation/document operations but not business admin', () => {
    expect(hasCapability('operateur', 'TRANSLATION_APPROVE')).toBe(true);
    expect(hasCapability('operateur', 'DOCUMENT_UPLOAD')).toBe(true);
    expect(hasCapability('operateur', 'AGREEMENT_MANAGE')).toBe(false);
    expect(hasCapability('operateur', 'USER_MANAGE')).toBe(false);
    expect(hasCapability('operateur', 'PORTAL_PUBLICATION_MANAGE')).toBe(false);
  });

  it('admin has business + user management but not system settings mutation', () => {
    expect(hasCapability('admin', 'AGREEMENT_MANAGE')).toBe(true);
    expect(hasCapability('admin', 'USER_MANAGE')).toBe(true);
    expect(hasCapability('admin', 'SYSTEM_SETTINGS_VIEW')).toBe(true);
    expect(hasCapability('admin', 'SYSTEM_SETTINGS_MANAGE')).toBe(false);
  });

  it('super_admin has everything admin has, plus system settings mutation', () => {
    expect(hasCapability('super_admin', 'SYSTEM_SETTINGS_MANAGE')).toBe(true);
    for (const capability of ROLE_CAPABILITIES.admin) {
      expect(hasCapability('super_admin', capability)).toBe(true);
    }
  });

  it('SYSTEM_ADMIN_OPERATION (high-risk jobs) is super_admin only - admin lacks it', () => {
    expect(hasCapability('super_admin', 'SYSTEM_ADMIN_OPERATION')).toBe(true);
    expect(hasCapability('admin', 'SYSTEM_ADMIN_OPERATION')).toBe(false);
  });
});

describe('hasCapability - edge cases (fail closed, never throw)', () => {
  it('an unrecognized role string denies rather than throwing', () => {
    // simulates a corrupted session / stale role value no longer in the enum
    // (e.g. a pre-migration 'traducteur'/'relecteur' JWT that outlived its access-token TTL)
    expect(() => hasCapability('gestionnaire' as never, 'REQUEST_VIEW_OWN')).not.toThrow();
    expect(hasCapability('gestionnaire' as never, 'REQUEST_VIEW_OWN')).toBe(false);
  });

  it('an empty string role denies rather than throwing', () => {
    expect(hasCapability('' as never, 'REQUEST_VIEW_OWN')).toBe(false);
  });
});

describe('hasAnyCapability / hasAllCapabilities', () => {
  it('hasAnyCapability passes if at least one capability matches', () => {
    expect(hasAnyCapability('agent', ['AGREEMENT_MANAGE', 'REQUEST_VIEW_OWN'])).toBe(true);
    expect(hasAnyCapability('agent', ['AGREEMENT_MANAGE', 'USER_MANAGE'])).toBe(false);
  });

  it('hasAllCapabilities requires every capability to match', () => {
    expect(hasAllCapabilities('admin', ['USER_MANAGE', 'AUDIT_VIEW'])).toBe(true);
    expect(hasAllCapabilities('admin', ['USER_MANAGE', 'SYSTEM_SETTINGS_MANAGE'])).toBe(false);
  });
});
