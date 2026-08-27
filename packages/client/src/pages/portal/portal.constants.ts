// packages/client/src/pages/portal/portal.constants.ts
// Miroir de l'enum serveur document_categorie (schema.ts) — un libellé
// public ici pour chaque valeur réelle, jamais l'inverse (aucune catégorie
// inventée qui n'existerait pas côté backend).
export const PORTAL_CATEGORY_LABELS: Record<string, string> = {
  accord: 'Accords',
  correspondance: 'Correspondances',
  mission: 'Missions',
  traduction: 'Traductions',
  glossaire: 'Glossaire',
  rapport: 'Rapports',
  autre: 'Autres',
};

export function getPortalCategoryLabel(categorie: string): string {
  return PORTAL_CATEGORY_LABELS[categorie] ?? categorie;
}

// Description statique de présentation pour les cartes de navigation —
// texte produit, pas une métadonnée du document (aucune description par
// document n'existe côté serveur).
export const PORTAL_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  accord: 'Accords et conventions publiés.',
  correspondance: 'Courriers et correspondances publics.',
  mission: 'Rapports et comptes-rendus de mission.',
  traduction: 'Documents traduits mis à disposition.',
  glossaire: 'Ressources terminologiques.',
  rapport: "Rapports d'activités et études.",
  autre: 'Autres documents publiés.',
};

export const PORTAL_CATEGORY_ORDER = [
  'accord',
  'correspondance',
  'mission',
  'traduction',
  'glossaire',
  'rapport',
  'autre',
];

export const PORTAL_PAGE_SIZE = 8;
