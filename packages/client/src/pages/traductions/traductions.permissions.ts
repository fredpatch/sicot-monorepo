// packages/client/src/pages/traductions/traductions.permissions.ts
//
// Client-side action matrix for the translation workshop - extracted during
// the Phase 10.2 authorization-alignment fix, mirrors traduction.route.ts
// exactly: capability check per action (requireCapability/
// requireAllCapabilities server-side) AND the existing workflow-state
// condition, following the same "capability AND context" pattern as
// requests.permissions.ts. Before this fix, WorkshopHeader gated these
// buttons on workflow state alone - any TRANSLATION_VIEW holder saw them
// regardless of finer capability, relying entirely on the server's 403 to
// actually stop the action. No live role could hit that gap (TRANSLATION_
// VIEW/PROCESS/REVIEW/APPROVE/ARCHIVE are bundled together for operateur+),
// but the frontend should express the real capability contract, not just
// today's role bundling.
import { hasAllCapabilities, type Capability, type UserRole } from '@sicot/shared';
import type { Traduction } from './traductions.types';

interface TraductionUser {
  role: UserRole;
}

function can(user: TraductionUser | null | undefined, ...capabilities: Capability[]) {
  return !!user && hasAllCapabilities(user.role, capabilities);
}

const STATUTS_MODIFIABLES: Traduction['statut'][] = [
  'a_reviser',
  'en_relecture',
  'manuelle_requise',
];

export function canSaveCorrection(
  traduction: Traduction,
  user: TraductionUser | null | undefined
): boolean {
  return STATUTS_MODIFIABLES.includes(traduction.statut) && can(user, 'TRANSLATION_PROCESS');
}

// Mirrors requireAllCapabilities('TRANSLATION_REVIEW', 'TRANSLATION_APPROVE')
// on PATCH /:id/approuver - both are required server-side, not just APPROVE,
// even though today they're always granted together (operateur+). Does not
// introduce a separation-of-duties rule: this only checks what the acting
// user holds, never who processed the translation - the same person can
// still process and approve their own work in V1.
export function canApproveTraduction(
  traduction: Traduction,
  user: TraductionUser | null | undefined
): boolean {
  return (
    STATUTS_MODIFIABLES.includes(traduction.statut) &&
    can(user, 'TRANSLATION_REVIEW', 'TRANSLATION_APPROVE')
  );
}

export function canArchiveTraduction(
  traduction: Traduction,
  user: TraductionUser | null | undefined
): boolean {
  return traduction.statut === 'approuvee' && can(user, 'TRANSLATION_ARCHIVE');
}
