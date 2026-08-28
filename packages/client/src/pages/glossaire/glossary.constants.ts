// packages/client/src/pages/glossaire/glossary.constants.ts
export const GLOSSAIRE_PAGE_SIZE = 10;

export const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'actif', label: 'Actifs' },
  { value: 'inactif', label: 'Inactifs' },
];

// Langues actuellement supportées par le backend (FR/EN fixes). L'ajout
// d'une langue ne nécessite pas de changer l'architecture du registre -
// voir glossary.adapters.ts.
export const LANGUE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};
