// packages/client/src/pages/partenaires/partenaires.permissions.ts
//
// Mirrors the server-side capability gate exactly (packages/server/src/
// modules/partenaires/routes/organisations.route.ts): viewing partners
// requires PARTNER_VIEW (the /partenaires route guard), all mutations -
// organisation create/edit AND contact create/edit/principal - require
// PARTNER_MANAGE (contacts have no separate capability server-side, so this
// reflects the actual implementation rather than assuming one exists). Same
// alignment rule established in Phase 10.2/10.4.
import { hasCapability, type UserRole } from '@sicot/shared';

export function canManagePartenaires(role: UserRole | undefined): boolean {
  return !!role && hasCapability(role, 'PARTNER_MANAGE');
}
