// packages/client/src/pages/courriers/courrier.permissions.ts
//
// Mirrors the server-side capability gate exactly (packages/server/src/
// modules/courriers/routes/courriers.route.ts): viewing courriers requires
// CORRESPONDENCE_VIEW (the /courriers route guard), all mutations - create,
// edit, archive, attach/remove documents, relance notifications - require
// CORRESPONDENCE_MANAGE. Same alignment rule established in Phase 10.2/10.4.
import { hasCapability, type UserRole } from '@sicot/shared';

export function canManageCourriers(role: UserRole | undefined): boolean {
  return !!role && hasCapability(role, 'CORRESPONDENCE_MANAGE');
}
