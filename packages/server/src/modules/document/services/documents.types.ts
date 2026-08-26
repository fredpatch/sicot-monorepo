export type DocumentCategorie =
  'accord' | 'correspondance' | 'mission' | 'traduction' | 'glossaire' | 'rapport' | 'autre';

export interface UploadDocumentParams {
  buffer: Buffer;
  nomOriginal: string;
  mimeType: string;
  categorie: DocumentCategorie;
  uploadePar: number;
}

export interface DocumentView {
  id: number;
  nom: string;
  nomOriginal: string;
  chemin: string;
  mimeType: string;
  taille: number;
  categorie: DocumentCategorie;
  langue?: string;
  texteExtrait?: string;
  statutOCR: string;
  hashMD5: string;
  version: number;
  parentId?: number;
  uploadePar: number;
  createdAt: Date;
  visibilitePortail: boolean;
  portailTokenDureeJours?: number;
}

export interface DocumentFilters {
  search?: string;
  categorie?: DocumentCategorie;
  statutOCR?: string;
  page?: number;
  pageSize?: number;
  avecSupprimes?: boolean;
  // Ne garder que la dernière version de chaque document — càd les lignes
  // qu'aucune autre ligne ne référence via parentId. Couvre à la fois les
  // documents jamais versionnés (final par construction, aucun enfant) et
  // la dernière version d'une chaîne (nouvelle-version) ; exclut les
  // versions intermédiaires désormais remplacées.
  finalesUniquement?: boolean;
}

export interface DoublonInfo {
  existe: boolean;
  document?: DocumentView;
}
