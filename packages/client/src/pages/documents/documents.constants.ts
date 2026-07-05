// packages/client/src/pages/documents/documents.constants.ts
import type { Categorie } from './documents.types';

export const CATEGORIES: { value: Categorie; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'accord', label: 'Accords' },
  { value: 'correspondance', label: 'Correspondances' },
  { value: 'mission', label: 'Missions' },
  { value: 'traduction', label: 'Traductions' },
  { value: 'glossaire', label: 'Glossaire' },
  { value: 'rapport', label: 'Rapports' },
  { value: 'autre', label: 'Autres' },
];

export const STATUTS_OCR = [
  { value: '__all__', label: 'Tous les statuts OCR' },
  { value: 'traite', label: 'Traité' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'a_retraiter', label: 'À retraiter' },
  { value: 'echec', label: 'Échec' },
];
