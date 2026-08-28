// packages/client/src/pages/glossaire/glossary.permissions.ts
//
// Mirrors the server-side capability gate exactly (packages/server/src/
// modules/glossaire/routes/glossaire.route.ts): viewing the glossary
// requires GLOSSARY_VIEW, all mutations (create/edit/deactivate/reactivate)
// require GLOSSARY_MANAGE. Fixed during Phase 10.4's final alignment pass -
// same frontend/backend capability alignment rule established in Phase
// 10.2, not a new authorization architecture; see documents.permissions.ts
// for the equivalent pattern on the documents module.
import { hasCapability, type UserRole } from '@sicot/shared';

export function canManageGlossaire(role: UserRole | undefined): boolean {
  return !!role && hasCapability(role, 'GLOSSARY_MANAGE');
}
