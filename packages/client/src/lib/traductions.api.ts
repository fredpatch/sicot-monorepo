import api from './axios';

export type TraductionStatut =
  'a_reviser' | 'en_relecture' | 'approuvee' | 'archivee' | 'manuelle_requise';
export type TraductionDirection = 'fr_en' | 'en_fr';

export type TraductionVue = 'actives' | 'supprimees';

export interface TraductionsAggregates {
  total: number;
  aReviser: number;
  enRelecture: number;
  manuelleRequise: number;
  approuvees: number;
  archivees: number;
  supprimees: number;
}

export interface TraductionView {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: TraductionDirection;
  statut: TraductionStatut;
  moteurUtilise: string;
  traducteurId?: number;
  relecteurId?: number;
  createdAt: string;
  updatedAt: string;
}

export const traductionsApi = {
  lister: (params?: {
    search?: string;
    statut?: TraductionStatut;
    direction?: TraductionDirection;
    vue?: TraductionVue;
    source?: 'libre' | 'document';
    page?: number;
    pageSize?: number;
  }) => api.get('/traductions', { params }),

  aggregates: () => api.get('/traductions/aggregates'),

  getById: (id: number) => api.get(`/traductions/${id}`),

  // Réservé aux traductions approuvées/archivées côté serveur — le bouton
  // de téléchargement ne doit apparaître que dans ce cas (voir TraductionPreview).
  getUrlExportPDF: (id: number) => `/api/traductions/${id}/export/pdf`,
  getUrlExportDOCX: (id: number) => `/api/traductions/${id}/export/docx`,

  moteurStatus: () => api.get('/traductions/moteur/status'),

  lancer: (data: { texteOriginal: string; direction: TraductionDirection; documentId?: number }) =>
    api.post('/traductions', data, { timeout: 450000 }), // 7.5 minutes pour les gros documents

  relancer: (id: number) => api.patch(`/traductions/${id}/relancer`, undefined, { timeout: 300000 }),

  sauvegarderCorrection: (id: number, texteFinal: string) =>
    api.patch(`/traductions/${id}/correction`, { texteFinal }),

  approuver: (id: number) => api.patch(`/traductions/${id}/approuver`),

  archiver: (id: number) => api.patch(`/traductions/${id}/archiver`),

  suggestions: (id: number, texte: string, origine: 'source' | 'traduction') =>
    api.get(`/traductions/${id}/suggestions`, { params: { texte, origine } }),

  supprimer: (id: number) => api.delete(`/traductions/${id}`),

  restaurer: (id: number) => api.patch(`/traductions/${id}/restaurer`),
};
