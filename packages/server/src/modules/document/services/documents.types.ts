export type DocumentCategorie =
  'accord' | 'correspondance' | 'mission' | 'traduction' | 'glossaire' | 'rapport' | 'autre';

export interface UploadDocumentParams {
  buffer: Buffer;
  nomOriginal: string;
  mimeType: string;
  categorie: DocumentCategorie;
  uploadePar: number;
  // Omis = false par défaut (colonne DB). Voir documents.service.ts pour
  // qui a le droit de le forcer à true.
  visibiliteInterne?: boolean;
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
  visibiliteInterne: boolean;
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
  // Restreint la lecture à "visible en interne OU uploadé par cet
  // utilisateur" — utilisé pour le rôle agent uniquement ; omis (undefined)
  // pour traducteur+ qui voit tout, comme aujourd'hui.
  visibleOuUploadePar?: number;
}

export interface DoublonInfo {
  existe: boolean;
  document?: DocumentView;
}

// Forme allégée retournée par le listing — sans texteExtrait ni chemin
// (potentiellement volumineux / chemin serveur non destiné au client), voir
// listerDocuments. Le détail complet reste disponible via GET /:id.
export type DocumentListView = Omit<DocumentView, 'texteExtrait' | 'chemin'>;

export interface DocumentsAggregates {
  total: number;
  ocrTraites: number;
  ocrEnAttente: number;
  ocrEchecs: number;
  categories: number;
  portailExposes: number;
}
