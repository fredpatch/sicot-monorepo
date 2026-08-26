// packages/client/src/pages/demandes/requests.constants.ts
export const REQUEST_PAGE_SIZE = 10;

export const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'soumise', label: 'Soumise / À assigner' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_relecture', label: 'En relecture' },
  { value: 'validee', label: 'Validée' },
  { value: 'archivee', label: 'Archivée' },
];

export const FILTRES_PRIORITE = [
  { value: '__all__', label: 'Toutes priorités' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'normale', label: 'Normale' },
];

export const FILTRES_DIRECTION = [
  { value: '__all__', label: 'Toutes directions' },
  { value: 'fr_en', label: 'FR → EN' },
  { value: 'en_fr', label: 'EN → FR' },
];

export const FILTRES_ASSIGNATION = [
  { value: '__all__', label: 'Toutes' },
  { value: 'non_assignees', label: 'Non assignées' },
  { value: 'mes_demandes', label: 'Mes demandes' },
  { value: 'mes_traductions', label: 'Mes traductions' },
];
