// packages/client/src/pages/documents/documents.types.ts
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
