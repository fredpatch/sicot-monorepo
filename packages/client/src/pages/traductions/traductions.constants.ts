// packages/client/src/pages/traductions/traductions.constants.ts
export const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'a_reviser', label: 'À réviser' },
  { value: 'en_relecture', label: 'En relecture' },
  { value: 'approuvee', label: 'Approuvée' },
  { value: 'archivee', label: 'Archivée' },
  { value: 'manuelle_requise', label: 'Manuelle requise' },
];

export const FILTRES_DIRECTION = [
  { value: '__all__', label: 'Toutes directions' },
  { value: 'fr_en', label: 'FR → EN' },
  { value: 'en_fr', label: 'EN → FR' },
];
