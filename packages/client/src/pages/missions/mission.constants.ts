import type { MissionStatut, RecommandationStatut, LogistiqueStatut } from '@/lib/missions.api';

export const MISSION_PAGE_SIZE = 10;

// A mission departing within this window with logistics not yet confirmed
// is flagged at-risk — kept in sync with the server's
// LOGISTIQUE_RISQUE_JOURS in missions.service.ts.
export const MISSION_LOGISTICS_RISK_DAYS = 14;

export const MISSION_UPCOMING_WINDOW_DAYS = 30;

export const MISSION_STATUS_LABELS: Record<MissionStatut, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

export const MISSION_STATUS_OPTIONS: { value: MissionStatut; label: string }[] = [
  { value: 'planifiee', label: MISSION_STATUS_LABELS.planifiee },
  { value: 'en_cours', label: MISSION_STATUS_LABELS.en_cours },
  { value: 'terminee', label: MISSION_STATUS_LABELS.terminee },
  { value: 'annulee', label: MISSION_STATUS_LABELS.annulee },
];

export const LOGISTIQUE_STATUS_LABELS: Record<LogistiqueStatut, string> = {
  a_planifier: 'À planifier',
  en_cours: 'En cours',
  confirme: 'Confirmée',
};

export const LOGISTIQUE_STATUS_OPTIONS: { value: LogistiqueStatut; label: string }[] = [
  { value: 'a_planifier', label: LOGISTIQUE_STATUS_LABELS.a_planifier },
  { value: 'en_cours', label: LOGISTIQUE_STATUS_LABELS.en_cours },
  { value: 'confirme', label: LOGISTIQUE_STATUS_LABELS.confirme },
];

// The logistics checklist — confirmationLogistique is derived from these
// three items (none checked → à planifier, all checked → confirmée,
// otherwise → en cours).
export const LOGISTIQUE_CHECKLIST_ITEMS: {
  key: 'logistiqueBilletReserve' | 'logistiqueHebergementConfirme' | 'logistiqueFinancementValide';
  label: string;
}[] = [
  { key: 'logistiqueBilletReserve', label: 'Billet réservé' },
  { key: 'logistiqueHebergementConfirme', label: 'Hébergement confirmé' },
  { key: 'logistiqueFinancementValide', label: 'Financement validé' },
];

export const REPORT_FILTER_OPTIONS = [
  { value: '__all__', label: 'Tous' },
  { value: 'disponible', label: 'Rapport disponible' },
  { value: 'manquant', label: 'Rapport manquant' },
];

export const RECOMMANDATION_STATUS_LABELS: Record<RecommandationStatut, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  realisee: 'Réalisée',
};
