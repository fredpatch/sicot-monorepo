// packages/client/src/pages/demandes/requests.permissions.ts
//
// Centralizes the request action matrix - mirrors the server's guards
// exactly (demandes.route.ts / demandes.controller.ts): a capability check
// per action, matching requireCapability() server-side, plus the same
// contextual ownership/workflow-state predicates the server enforces
// independently (Phase 4.5). Capabilities answer "may this role attempt
// this category of action"; ownership/state answer "on this specific
// record, right now" - kept as separate, explicit predicates rather than
// collapsed into a single role check (Phase 5.3).
import { hasCapability, type UserRole } from '@sicot/shared';
import type { Demande } from './requests.types';

interface RequestUser {
  id: number;
  role: UserRole;
}

function can(
  user: RequestUser | null | undefined,
  capability: Parameters<typeof hasCapability>[1]
): boolean {
  return !!user && hasCapability(user.role, capability);
}

export function canTakeRequest(demande: Demande, user: RequestUser | null | undefined): boolean {
  return demande.statut === 'soumise' && !demande.verrou && can(user, 'REQUEST_TAKE');
}

// Ownership (demandeurId === user.id) - not a capability question at all;
// REQUEST_RECALL_OWN is held by every target role, so the capability check
// here is a no-op in practice today, kept for parity with the server's
// requireCapability('REQUEST_RECALL_OWN') + ownership check shape.
export function canRecallRequest(demande: Demande, user: RequestUser | null | undefined): boolean {
  return (
    demande.statut === 'soumise' &&
    demande.demandeurId === user?.id &&
    can(user, 'REQUEST_RECALL_OWN')
  );
}

// Assigned-translator ownership (traducteurId === user.id) stays an
// explicit predicate - REQUEST_SUBMIT_REVIEW alone would let any
// operateur+ submit someone else's in-progress translation for review.
export function canSubmitForReview(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return (
    demande.statut === 'en_cours' &&
    demande.traducteurId === user?.id &&
    can(user, 'REQUEST_SUBMIT_REVIEW')
  );
}

// Reste disponible même après une première validation - un opérateur doit
// pouvoir revenir changer la priorité (ex. le demandeur avait sous-estimé
// l'urgence), pas seulement la valider une fois pour toutes.
export function canValidatePriority(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.statut !== 'archivee' && can(user, 'REQUEST_PRIORITY_VALIDATE');
}

export function canValidateRequest(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.statut === 'en_relecture' && can(user, 'REQUEST_VALIDATE');
}

export function canArchiveRequest(demande: Demande, user: RequestUser | null | undefined): boolean {
  return demande.statut === 'validee' && can(user, 'REQUEST_ARCHIVE');
}

// Deliberately gated on TRANSLATION_VIEW - matches the destination route's
// own guard (/traductions/:id in router.tsx) exactly, so this button never
// shows for a role the route itself would bounce. The destination is the
// full editing workshop (correction/approbation/suppression), not a
// read-only viewer - an agent's own linked translation isn't safe to open
// here until a real read-only preview exists (tracked in the backlog).
export function canOpenTranslation(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.traductionId !== undefined && can(user, 'TRANSLATION_VIEW');
}

export type RequestActionId =
  | 'prendre_en_charge'
  | 'rappeler'
  | 'soumettre_relecture'
  | 'valider_priorite'
  | 'valider'
  | 'archiver'
  | 'ouvrir_traduction';

/** The single most relevant action for this row, per the brief's "one primary
 * contextual action" guidance - everything else stays a secondary icon button. */
export function getRequestPrimaryAction(
  demande: Demande,
  user: RequestUser | null | undefined
): RequestActionId | null {
  if (canTakeRequest(demande, user)) return 'prendre_en_charge';
  if (canSubmitForReview(demande, user)) return 'soumettre_relecture';
  if (canValidateRequest(demande, user)) return 'valider';
  if (canOpenTranslation(demande, user)) return 'ouvrir_traduction';
  return null;
}
