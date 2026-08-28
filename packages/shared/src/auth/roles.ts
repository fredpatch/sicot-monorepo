// packages/shared/src/auth/roles.ts
//
// Final persistent role model (Phase 6.1). One role per user, no numeric
// hierarchy - capabilities decide what it can do. 'traducteur'/'relecteur'
// were migrated to 'operateur' and no longer exist in the database or in
// this type.

export type UserRole = 'agent' | 'operateur' | 'admin' | 'super_admin';

export const TARGET_ROLES: readonly UserRole[] = ['agent', 'operateur', 'admin', 'super_admin'];
