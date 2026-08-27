// packages/client/src/pages/documents/documents.types.ts
//
// texteExtrait n'est présent que sur la réponse de détail
// (GET /documents/:id) — le listing (GET /documents) ne le renvoie plus,
// pour éviter d'envoyer un texte OCR potentiellement volumineux sur chaque
// ligne de chaque page (voir documents.service.ts côté serveur). Utiliser
// statutOCR === 'traite' pour toute décision d'éligibilité au niveau du
// registre (ex. affichage du bouton Traduire) plutôt que la présence de
// texteExtrait, qui n'y est simplement plus disponible.
export interface Document {
  id: number;
  nom: string;
  nomOriginal: string;
  mimeType: string;
  taille: number;
  categorie: string;
  langue?: string;
  statutOCR: string;
  version: number;
  uploadePar: number;
  texteExtrait?: string;
  createdAt: string;
  visibilitePortail: boolean;
  portailTokenDureeJours?: number;
  visibiliteInterne: boolean;
}

export interface DocumentsAggregates {
  total: number;
  ocrTraites: number;
  ocrEnAttente: number;
  ocrEchecs: number;
  categories: number;
  portailExposes: number;
}

export type Categorie =
  | 'tous'
  | 'accord'
  | 'correspondance'
  | 'mission'
  | 'traduction'
  | 'glossaire'
  | 'rapport'
  | 'autre';
