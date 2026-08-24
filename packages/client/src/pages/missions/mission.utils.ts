import {
  MISSION_LOGISTICS_RISK_DAYS,
  MISSION_UPCOMING_WINDOW_DAYS,
} from './mission.constants';
import type { Mission, RecommandationView } from './mission.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseMissionDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMissionDate(value?: string | Date | null, month: 'short' | 'long' = 'short') {
  const date = parseMissionDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' });
}

// Plain-text period, for contexts JSX can't reach (aria-label, title) —
// visual display uses the <MissionPeriod> component (icon, not "→").
export function formatMissionPeriod(period: { dateDebut?: string; dateFin?: string }) {
  return `Du ${formatMissionDate(period.dateDebut)} au ${formatMissionDate(period.dateFin)}`;
}

export function getMissionDuration(mission: Pick<Mission, 'dateDebut' | 'dateFin'>): number | null {
  const debut = parseMissionDate(mission.dateDebut);
  const fin = parseMissionDate(mission.dateFin);
  if (!debut || !fin) return null;
  return Math.max(1, Math.round((fin.getTime() - debut.getTime()) / MS_PER_DAY) + 1);
}

export function daysUntilMissionStart(
  mission: Pick<Mission, 'dateDebut'>,
  now = new Date()
): number | null {
  const debut = parseMissionDate(mission.dateDebut);
  if (!debut) return null;
  return Math.ceil((debut.getTime() - now.getTime()) / MS_PER_DAY);
}

// Derived, never stored — planifiee/en_cours/terminee/annulee already come
// from the server; this only adds the "starts soon" / date-vs-status
// consistency signal on top, per the brief's §22.
export function getMissionLifecycleState(
  mission: Pick<Mission, 'statut' | 'dateDebut' | 'dateFin'>,
  now = new Date()
): 'a_venir' | 'en_cours' | 'terminee' | 'annulee' {
  if (mission.statut === 'annulee') return 'annulee';
  if (mission.statut === 'terminee') return 'terminee';
  if (mission.statut === 'en_cours') return 'en_cours';
  const debut = parseMissionDate(mission.dateDebut);
  if (debut && debut.getTime() <= now.getTime()) return 'en_cours';
  return 'a_venir';
}

export function isMissionUpcoming(
  mission: Pick<Mission, 'statut' | 'dateDebut'>,
  now = new Date()
): boolean {
  if (mission.statut !== 'planifiee') return false;
  const days = daysUntilMissionStart(mission, now);
  return days !== null && days >= 0 && days <= MISSION_UPCOMING_WINDOW_DAYS;
}

export function isMissionLogisticsAtRisk(
  mission: Pick<Mission, 'statut' | 'dateDebut' | 'confirmationLogistique'>,
  now = new Date()
): boolean {
  if (mission.statut !== 'planifiee' || mission.confirmationLogistique === 'confirme') return false;
  const days = daysUntilMissionStart(mission, now);
  return days !== null && days >= 0 && days <= MISSION_LOGISTICS_RISK_DAYS;
}

export function isMissionReportMissing(mission: Pick<Mission, 'statut' | 'rapportDocumentId'>): boolean {
  return mission.statut === 'terminee' && !mission.rapportDocumentId;
}

export function isRecommendationOverdue(
  rec: Pick<RecommandationView, 'statut' | 'dateLimite'>,
  now = new Date()
): boolean {
  if (rec.statut === 'realisee' || !rec.dateLimite) return false;
  const limite = parseMissionDate(rec.dateLimite);
  return limite !== null && limite.getTime() < now.getTime();
}

export function countOverdueRecommendations(recs: RecommandationView[] = [], now = new Date()) {
  return recs.filter((rec) => isRecommendationOverdue(rec, now)).length;
}

export function countPendingRecommendations(recs: RecommandationView[] = []) {
  return recs.filter((rec) => rec.statut !== 'realisee').length;
}

export interface MissionHealth {
  tone: 'critical' | 'warning' | 'normal';
  label: string;
  helper: string;
}

// One derived signal folding lifecycle + logistics risk + missing report +
// overdue recommendations into a single "what needs attention" answer —
// shown consistently across the registry row, detail summary strip, and
// section nav (see mission.utils.ts note in the Phase 2 plan).
export function getMissionHealth(
  mission: Pick<Mission, 'statut' | 'dateDebut' | 'dateFin' | 'confirmationLogistique' | 'rapportDocumentId'>,
  recommandations: RecommandationView[] = [],
  now = new Date()
): MissionHealth | null {
  if (mission.statut === 'annulee') return null;

  if (isMissionLogisticsAtRisk(mission, now)) {
    const days = daysUntilMissionStart(mission, now)!;
    return {
      tone: 'critical',
      label: 'Logistique à risque',
      helper:
        days <= 0
          ? 'Départ imminent — logistique non confirmée.'
          : `Départ dans ${days} j — logistique non confirmée.`,
    };
  }

  if (isMissionReportMissing(mission)) {
    return {
      tone: 'warning',
      label: 'Rapport manquant',
      helper: 'Mission terminée — aucun rapport de mission déposé.',
    };
  }

  const overdue = countOverdueRecommendations(recommandations, now);
  if (overdue > 0) {
    return {
      tone: 'warning',
      label: `${overdue} recommandation${overdue > 1 ? 's' : ''} dépassée${overdue > 1 ? 's' : ''}`,
      helper: 'Une ou plusieurs recommandations ont dépassé leur date limite.',
    };
  }

  return null;
}
