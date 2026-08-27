// packages/client/src/pages/portal/portal.types.ts
export interface DocumentPortail {
  id: number;
  nomOriginal: string;
  categorie: string;
  langue?: string;
  taille: number;
  mimeType: string;
  portailTokenDureeJours?: number;
  createdAt: string;
}

export interface PortailAggregates {
  total: number;
  parCategorie: Record<string, number>;
}
