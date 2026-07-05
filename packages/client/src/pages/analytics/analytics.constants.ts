// packages/client/src/pages/analytics/analytics.constants.ts
import { COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';
import type { Onglet, PeriodePreset } from './analytics.types';

export const ONGLETS: { cle: Onglet; label: string }[] = [
  { cle: 'global', label: 'Vue globale' },
  { cle: 'accords', label: 'Accords' },
  { cle: 'courriers', label: 'Courriers' },
  { cle: 'missions', label: 'Missions' },
  { cle: 'traductions', label: 'Traductions' },
  { cle: 'demandes', label: 'Demandes' },
  { cle: 'documents', label: 'Documents' },
  { cle: 'glossaire', label: 'Glossaire' },
  { cle: 'rapports', label: 'Rapports' },
];

export const PRESETS: { cle: PeriodePreset; label: string; jours?: number }[] = [
  { cle: '7j', label: '7 derniers jours', jours: 7 },
  { cle: '30j', label: '30 derniers jours', jours: 30 },
  { cle: '90j', label: '90 derniers jours', jours: 90 },
  { cle: '6mois', label: '6 derniers mois', jours: 182 },
  { cle: '1an', label: '12 derniers mois', jours: 365 },
  { cle: 'personnalise', label: 'Personnalisé' },
];

export const LABELS_TYPE_ORGANISATION: Record<string, string> = {
  anac_etrangere: 'ANAC étrangère',
  organisation_internationale: 'Organisation internationale',
  autre: 'Autre',
};

export const LABELS_DIRECTION: Record<string, string> = {
  fr_en: 'FR → EN',
  en_fr: 'EN → FR',
};

export const LABELS_CATEGORIE: Record<string, string> = {
  accord: 'Accord',
  correspondance: 'Correspondance',
  mission: 'Mission',
  traduction: 'Traduction',
  glossaire: 'Glossaire',
  autre: 'Autre',
};

export const PALETTE_CATEGORIES = [
  COULEURS_GRAPHIQUE.navy,
  COULEURS_GRAPHIQUE.primaire,
  COULEURS_GRAPHIQUE.succes,
  COULEURS_GRAPHIQUE.attention,
  COULEURS_GRAPHIQUE.danger,
  COULEURS_GRAPHIQUE.muted,
];

export const MODULES_DISPONIBLES: { cle: string; label: string }[] = [
  { cle: 'global', label: 'Vue globale' },
  { cle: 'accords', label: 'Accords' },
  { cle: 'courriers', label: 'Courriers' },
  { cle: 'missions', label: 'Missions' },
  { cle: 'traductions', label: 'Traductions' },
  { cle: 'demandes', label: 'Demandes' },
  { cle: 'documents', label: 'Documents' },
  { cle: 'glossaire', label: 'Glossaire' },
];
