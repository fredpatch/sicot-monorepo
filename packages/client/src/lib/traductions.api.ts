import api from './axios';

export type TraductionStatut =
  'a_reviser' | 'en_relecture' | 'approuvee' | 'archivee' | 'manuelle_requise';
export type TraductionDirection = 'fr_en' | 'en_fr';

export const traductionsApi = {
  lister: (params?: {
    statut?: TraductionStatut;
    direction?: TraductionDirection;
    page?: number;
    pageSize?: number;
  }) => api.get('/traductions', { params }),

  getById: (id: number) => api.get(`/traductions/${id}`),

  moteurStatus: () => api.get('/traductions/moteur/status'),

  lancer: (data: { texteOriginal: string; direction: TraductionDirection; documentId?: number }) =>
    api.post('/traductions', data),

  sauvegarderCorrection: (id: number, texteFinal: string) =>
    api.patch(`/traductions/${id}/correction`, { texteFinal }),

  approuver: (id: number) => api.patch(`/traductions/${id}/approuver`),

  archiver: (id: number) => api.patch(`/traductions/${id}/archiver`),

  suggestions: (id: number, texte: string) =>
    api.get(`/traductions/${id}/suggestions`, { params: { texte } }),
};
