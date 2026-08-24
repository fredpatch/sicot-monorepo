import type { Courrier, CourrierCriticite } from './courrier.types';

export function parseCourrierDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCourrierDate(value?: string | Date | null, month: 'short' | 'long' = 'short') {
  const date = parseCourrierDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' });
}

export function getCourrierDirectionLabel(courrier: Pick<Courrier, 'direction'>): string {
  return courrier.direction === 'entrant' ? 'Entrant' : 'Sortant';
}

// The organisation that matters for a given direction — expéditeur for
// entrant, destinataire for sortant. Never mix the two up.
export function getCourrierInterlocutor(courrier: Pick<Courrier, 'direction' | 'expediteur' | 'destinataire'>) {
  return courrier.direction === 'entrant' ? courrier.expediteur : courrier.destinataire;
}

// The specific contact chosen within that organisation, if any — an
// explicit choice, never silently swapped for the organisation's generic
// contactPrincipal.
export function getCourrierContact(
  courrier: Pick<Courrier, 'direction' | 'expediteurContact' | 'destinataireContact'>
) {
  return courrier.direction === 'entrant' ? courrier.expediteurContact : courrier.destinataireContact;
}

export function daysUntilResponseDeadline(
  courrier: Pick<Courrier, 'dateLimiteReponse'>,
  now = new Date()
): number | null {
  const limite = parseCourrierDate(courrier.dateLimiteReponse);
  if (!limite) return null;
  return Math.ceil((limite.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function isCourrierOverdue(
  courrier: Pick<Courrier, 'dateLimiteReponse' | 'suiviStatut'>,
  now = new Date()
): boolean {
  if (courrier.suiviStatut !== 'en_attente') return false;
  const days = daysUntilResponseDeadline(courrier, now);
  return days !== null && days < 0;
}

// "J+3" / "Dans 5 jours" / "Aucune échéance" — plain text, readable without
// color, matches the mockup's deadline-cell wording.
export function formatCourrierDeadline(courrier: Pick<Courrier, 'dateLimiteReponse' | 'suiviStatut'>, now = new Date()): string {
  const limite = parseCourrierDate(courrier.dateLimiteReponse);
  if (!limite) return 'Aucune échéance';
  const days = daysUntilResponseDeadline(courrier, now)!;
  if (courrier.suiviStatut !== 'en_attente') return formatCourrierDate(limite);
  if (days < 0) return `J+${Math.abs(days)}`;
  if (days === 0) return "Aujourd'hui";
  return `Dans ${days} jour${days > 1 ? 's' : ''}`;
}

// The real 3-state lifecycle (en_attente → repondu | archive) — no invented
// stages. répondu is set automatically server-side when a reply is created;
// archivé is a manual action. See courriers.service.ts.
export function getCourrierLifecycleState(
  courrier: Pick<Courrier, 'suiviStatut'>
): 'en_attente' | 'repondu' | 'archive' {
  return courrier.suiviStatut;
}

// Computes dateDebut/dateFin (ISO date strings) for a Période filter value
// against dateReception. 'personnalisee' passes the caller-supplied range
// through as-is — no invented default range.
export function getPeriodeRange(
  periode: string,
  personnalisee?: { dateDebut?: string; dateFin?: string },
  now = new Date()
): { dateDebut?: string; dateFin?: string } {
  const toISODate = (d: Date) => d.toISOString().split('T')[0];

  if (periode === 'ce_mois') {
    return { dateDebut: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)) };
  }
  if (periode === '30_jours') {
    return { dateDebut: toISODate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) };
  }
  if (periode === 'cette_annee') {
    return { dateDebut: toISODate(new Date(now.getFullYear(), 0, 1)) };
  }
  if (periode === 'personnalisee') {
    return { dateDebut: personnalisee?.dateDebut, dateFin: personnalisee?.dateFin };
  }
  return {};
}

export interface CourrierHealth {
  tone: 'critical' | 'warning' | 'normal' | 'muted';
  label: string;
}

// Centralizes what CourriersPage's BadgeSuivi/BadgeDirection used to
// compute inline. criticite/joursAttente are derived server-side
// (calculerCriticite) — this only maps them to a consistent tone+label,
// it never recomputes the thresholds itself.
export function getCourrierHealth(courrier: Pick<Courrier, 'suiviStatut' | 'reponseRequise' | 'criticite'>): CourrierHealth {
  if (courrier.suiviStatut === 'archive') {
    return { tone: 'muted', label: 'Archivé' };
  }
  if (courrier.suiviStatut === 'repondu') {
    return { tone: 'normal', label: 'Répondu' };
  }

  const criticite: CourrierCriticite | undefined = courrier.criticite;
  if (criticite === 'critique') {
    return { tone: 'critical', label: 'En dépassement' };
  }
  if (criticite === 'a_surveiller') {
    return { tone: 'warning', label: 'À surveiller' };
  }
  if (courrier.reponseRequise === 'oui') {
    return { tone: 'warning', label: 'En attente' };
  }
  return { tone: 'muted', label: 'En attente' };
}
