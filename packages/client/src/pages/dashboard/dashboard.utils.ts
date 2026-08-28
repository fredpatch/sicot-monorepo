import { hasCapability, type Capability, type UserRole } from '@sicot/shared';
import type {
  ActiviteRecente,
  DashboardData,
  DeadlineItem,
  DemandeParStatut,
  PriorityItem,
} from './dashboard.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(from: Date, to: Date, mode: 'floor' | 'ceil' = 'floor'): number {
  const diff = (to.getTime() - from.getTime()) / MS_PER_DAY;
  return mode === 'ceil' ? Math.ceil(diff) : Math.floor(diff);
}

export function formatDate(value: string | Date | undefined, options?: Intl.DateTimeFormatOptions) {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatTime(value: Date) {
  return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatFullDate(value: Date) {
  return value.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatRelativeDate(value: string | Date | undefined, now = new Date()) {
  const date = toDate(value);
  if (!date) return '-';
  const days = daysBetween(date, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  return formatDate(date);
}

export function monthLabel(value: string) {
  const [year, month] = value.split('-').map((part) => parseInt(part, 10));
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
}

export function completionRate(total: number, approved: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((approved / total) * 100)));
}

export function derivePriorities(data: DashboardData, now = new Date()): PriorityItem[] {
  const items: PriorityItem[] = [];

  for (const accord of data.accordsExpires ?? []) {
    items.push({
      id: `accord-expire-${accord.id}`,
      severity: 'critical',
      entityType: 'Accord',
      reference: accord.reference,
      title: accord.titre,
      timing: `Expiré depuis ${accord.joursDepuisExpiration} j`,
      nextAction: 'Enregistrer la décision de renouvellement',
      href: `/accords/${accord.id}`,
      sortScore: -1000 - accord.joursDepuisExpiration,
    });
  }

  for (const courrier of data.couriersSansReponse ?? []) {
    const critical = courrier.joursAttente >= 90;
    const warning = courrier.joursAttente >= 60;
    if (!critical && !warning) continue;
    items.push({
      id: `courrier-${courrier.id}`,
      severity: critical ? 'critical' : 'warning',
      entityType: 'Courrier',
      reference: courrier.reference,
      title: courrier.objet,
      timing: `${courrier.joursAttente} j`,
      nextAction: 'Préparer une relance',
      href: `/courriers/${courrier.id}`,
      sortScore: (critical ? -800 : -300) - courrier.joursAttente,
    });
  }

  for (const accord of data.accordsExpirant ?? []) {
    items.push({
      id: `accord-expirant-${accord.id}`,
      severity: accord.joursRestants <= 30 ? 'critical' : 'warning',
      entityType: 'Accord',
      reference: accord.reference,
      title: accord.titre,
      timing: `Expire dans ${accord.joursRestants} j`,
      nextAction: 'Préparer le suivi',
      href: `/accords/${accord.id}`,
      sortScore: (accord.joursRestants <= 30 ? -700 : -200) + accord.joursRestants,
    });
  }

  for (const reco of data.recommandationsEnAttente ?? []) {
    const deadline = toDate(reco.dateLimite);
    const days = deadline ? daysBetween(now, deadline, 'ceil') : null;
    const critical = reco.depasse;
    const warning = days !== null && days >= 0 && days <= 14;
    if (!critical && !warning) continue;
    items.push({
      id: `recommandation-${reco.id}`,
      severity: critical ? 'critical' : 'warning',
      entityType: 'Recommandation',
      reference: `Mission ${reco.missionId}`,
      title: reco.texte,
      timing: critical
        ? `Dépassée${deadline ? ` depuis ${Math.abs(daysBetween(now, deadline, 'floor'))} j` : ''}`
        : `Échéance dans ${days} j`,
      nextAction: 'Mettre à jour le suivi',
      href: `/missions/${reco.missionId}`,
      sortScore: critical ? -900 : -250 + (days ?? 0),
    });
  }

  const pendingTranslations = asNumber(data.kpi?.traductionsEnAttente);
  if (pendingTranslations > 0) {
    items.push({
      id: 'traductions-attente',
      severity: 'warning',
      entityType: 'Traduction',
      reference: 'File de révision',
      title: `${pendingTranslations} traduction${pendingTranslations > 1 ? 's' : ''} à traiter`,
      timing: 'En attente',
      nextAction: 'Ouvrir la file de traduction',
      href: '/traductions',
      sortScore: -150,
    });
  }

  return items.sort((a, b) => a.sortScore - b.sortScore);
}

export function deriveNextDeadline(data: DashboardData, now = new Date()): DeadlineItem | null {
  const candidates: DeadlineItem[] = [];

  for (const accord of data.accordsExpirant ?? []) {
    const date = toDate(accord.dateExpiration);
    if (!date || date < now) continue;
    candidates.push({
      label: 'Accord',
      title: accord.reference,
      date,
      countdown: `J-${Math.max(0, daysBetween(now, date, 'ceil'))}`,
      href: `/accords/${accord.id}`,
    });
  }

  for (const reco of data.recommandationsEnAttente ?? []) {
    const date = toDate(reco.dateLimite);
    if (!date || date < now) continue;
    candidates.push({
      label: 'Recommandation',
      title: `Mission ${reco.missionId}`,
      date,
      countdown: `J-${Math.max(0, daysBetween(now, date, 'ceil'))}`,
      href: `/missions/${reco.missionId}`,
    });
  }

  return candidates.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
}

// Capacité requise par préfixe de route - doit rester alignée sur les
// gardes réels de router.tsx (Phase 5.1). Cette table avait dérivé : /
// traductions y était classée admin-only alors que la route elle-même
// n'exige que TRANSLATION_VIEW (operateur+) - corrigé ici (Phase 5.3).
const ROUTE_CAPABILITY: Record<string, Capability> = {
  '/accords': 'AGREEMENT_VIEW',
  '/courriers': 'CORRESPONDENCE_VIEW',
  '/missions': 'MISSION_REGISTRY_VIEW',
  '/traductions': 'TRANSLATION_VIEW',
  '/analytics': 'ANALYTICS_VIEW',
};

export function canAccessRoute(role: UserRole | undefined, href: string) {
  const prefix = Object.keys(ROUTE_CAPABILITY).find((route) => href.startsWith(route));
  if (!prefix) return true;
  return !!role && hasCapability(role, ROUTE_CAPABILITY[prefix]);
}

export function activityHref(activity: ActiviteRecente) {
  const match = activity.reference.match(/\d+/);
  const id = match?.[0];
  if (activity.type === 'accord' && id) return `/accords/${id}`;
  if (activity.type === 'courrier' && id) return `/courriers/${id}`;
  if (activity.type === 'mission' && id) return `/missions/${id}`;
  if (activity.type === 'traduction' && id) return `/traductions/${id}`;
  return null;
}

export function statusLabel(status: string) {
  const known: Record<string, string> = {
    soumise: 'Soumises',
    en_cours: 'En cours',
    en_relecture: 'En relecture',
    validee: 'Validées',
    archivee: 'Archivées',
  };
  return known[status] ?? status.replace(/_/g, ' ');
}

export function getRequestStatusTotal(rows: DemandeParStatut[], status: string) {
  return rows.find((row) => row.statut === status)?.total ?? 0;
}
