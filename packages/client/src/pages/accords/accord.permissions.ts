// packages/client/src/pages/accords/accord.permissions.ts
//
// Mirrors the server-side capability gate exactly (packages/server/src/
// modules/accords/routes/accords.route.ts): viewing accords requires
// AGREEMENT_VIEW (the /accords route guard), all mutations (create, edit,
// renewal, echeance notifications) require AGREEMENT_MANAGE. Same alignment
// rule established in Phase 10.2/10.4 - not a new authorization
// architecture. See documents.permissions.ts / glossary.permissions.ts for
// the equivalent pattern on the other modules.
import { hasCapability, type UserRole } from '@sicot/shared';

export function canManageAccords(role: UserRole | undefined): boolean {
  return !!role && hasCapability(role, 'AGREEMENT_MANAGE');
}
