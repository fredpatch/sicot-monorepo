// packages/client/src/pages/glossaire/glossary.types.ts
export interface HistoriqueEntry {
  id: number;
  ancienTermeFr?: string;
  ancienTermeEn?: string;
  modifieParNom?: string;
  createdAt: string;
}

export interface Terme {
  id: number;
  termeFr: string;
  termeEn: string;
  domaine?: string;
  contexte?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  historique?: HistoriqueEntry[];
}

export interface GlossaireAggregates {
  total: number;
  actifs: number;
  inactifs: number;
  domaines: number;
}
