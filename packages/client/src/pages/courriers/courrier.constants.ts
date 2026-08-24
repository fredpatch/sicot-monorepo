import type { CourrierDirection, CourrierReponseStatut, CourrierSuiviStatut, CourrierCriticite } from './courrier.types';

export const COURRIER_PAGE_SIZE = 8;

export const COURRIER_DIRECTION_LABELS: Record<CourrierDirection, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
};

export const COURRIER_DIRECTION_OPTIONS: { value: CourrierDirection; label: string }[] = [
  { value: 'entrant', label: COURRIER_DIRECTION_LABELS.entrant },
  { value: 'sortant', label: COURRIER_DIRECTION_LABELS.sortant },
];

export const COURRIER_STATUS_LABELS: Record<CourrierSuiviStatut, string> = {
  en_attente: 'En attente',
  repondu: 'Répondu',
  archive: 'Archivé',
};

export const COURRIER_STATUS_OPTIONS: { value: CourrierSuiviStatut; label: string }[] = [
  { value: 'en_attente', label: COURRIER_STATUS_LABELS.en_attente },
  { value: 'repondu', label: COURRIER_STATUS_LABELS.repondu },
  { value: 'archive', label: COURRIER_STATUS_LABELS.archive },
];

export const COURRIER_REPONSE_LABELS: Record<CourrierReponseStatut, string> = {
  oui: 'Oui',
  non: 'Non',
  pour_information: 'Pour information',
};

export const COURRIER_REPONSE_OPTIONS: { value: CourrierReponseStatut; label: string }[] = [
  { value: 'oui', label: COURRIER_REPONSE_LABELS.oui },
  { value: 'non', label: COURRIER_REPONSE_LABELS.non },
  { value: 'pour_information', label: COURRIER_REPONSE_LABELS.pour_information },
];

export const COURRIER_CRITICITE_LABELS: Record<CourrierCriticite, string> = {
  normal: 'Normale',
  a_surveiller: 'À surveiller',
  critique: 'Critique',
};

// "Réponse" filter — a derived view over direction+reponseRequise+suiviStatut+
// criticite, not a stored field. See courrier.utils.ts.
export const COURRIER_RESPONSE_FILTER_OPTIONS = [
  { value: '__all__', label: 'Toutes' },
  { value: 'attendue', label: 'Réponse attendue' },
  { value: 'en_depassement', label: 'En dépassement' },
  { value: 'repondu', label: 'Répondu' },
];

// "Période" filter — computed client-side into dateDebut/dateFin against
// dateReception (see courrier.utils.ts's getPeriodeRange).
export const COURRIER_PERIOD_OPTIONS = [
  { value: '__all__', label: 'Toutes' },
  { value: 'ce_mois', label: 'Ce mois' },
  { value: '30_jours', label: '30 derniers jours' },
  { value: 'cette_annee', label: 'Cette année' },
  { value: 'personnalisee', label: 'Personnalisée' },
];
