// packages/client/src/pages/demandes/requests.permissions.ts
//
// Centralizes the request action matrix — mirrors the server's guards exactly
// (demandes.service.ts) so a button is only ever shown when the matching API
// call would actually succeed. Role check mirrors the hierarchical
// requireRole() in packages/server/src/middleware/requiredRole.ts.
import type { Demande } from './requests.types';

interface RequestUser {
  id: number;
  role: string;
}

const ROLE_LEVEL: Record<string, number> = {
  agent: 1,
  traducteur: 2,
  relecteur: 3,
  admin: 4,
  super_admin: 5,
};

function roleAtLeast(user: RequestUser | null | undefined, minimum: string): boolean {
  if (!user) return false;
  return (ROLE_LEVEL[user.role] ?? 0) >= ROLE_LEVEL[minimum];
}

export function canTakeRequest(demande: Demande, user: RequestUser | null | undefined): boolean {
  return demande.statut === 'soumise' && !demande.verrou && roleAtLeast(user, 'traducteur');
}

export function canRecallRequest(demande: Demande, user: RequestUser | null | undefined): boolean {
  return demande.statut === 'soumise' && demande.demandeurId === user?.id;
}

export function canSubmitForReview(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.statut === 'en_cours' && demande.traducteurId === user?.id;
}

export function canValidatePriority(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return !demande.prioriteValidee && demande.statut !== 'archivee' && roleAtLeast(user, 'relecteur');
}

export function canValidateRequest(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.statut === 'en_relecture' && roleAtLeast(user, 'relecteur');
}

export function canArchiveRequest(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.statut === 'validee' && roleAtLeast(user, 'relecteur');
}

// Deliberately traducteur+ only — the destination (/traductions/:id) is the
// full admin editing workshop (correction/approbation/suppression), not a
// read-only viewer. An agent's own linked translation isn't safe to open
// here until a real read-only preview exists (tracked in the backlog).
export function canOpenTranslation(
  demande: Demande,
  user: RequestUser | null | undefined
): boolean {
  return demande.traductionId !== undefined && roleAtLeast(user, 'traducteur');
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
 * contextual action" guidance — everything else stays a secondary icon button. */
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
