export interface CreateTermeParams {
  termeFr: string;
  termeEn: string;
  domaine?: string;
  contexte?: string;
  createdByUserId: number;
}

export interface UpdateTermeParams {
  termeFr?: string;
  termeEn?: string;
  domaine?: string;
  contexte?: string;
  actif?: boolean;
  updatedByUserId: number;
}

export interface GlossaireFilters {
  search?: string;
  domaine?: string;
  actif?: boolean;
  page?: number;
  pageSize?: number;
}

export interface HistoriqueEntry {
  id: number;
  ancienTermeFr?: string;
  ancienTermeEn?: string;
  modifiePar?: number;
  modifieParNom?: string;
  createdAt: Date;
}

export interface TermeView {
  id: number;
  termeFr: string;
  termeEn: string;
  domaine?: string;
  contexte?: string;
  actif: boolean;
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
  historique?: HistoriqueEntry[];
}
