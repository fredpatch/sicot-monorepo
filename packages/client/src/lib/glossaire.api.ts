import api from './axios';

export const glossaireApi = {
  lister: (params?: {
    search?: string;
    domaine?: string;
    actif?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get('/glossaire', { params }),

  getById: (id: number) => api.get(`/glossaire/${id}`),

  suggestions: (q: string, limite?: number) =>
    api.get('/glossaire/suggestions', { params: { q, limite } }),

  creer: (data: { termeFr: string; termeEn: string; domaine?: string; contexte?: string }) =>
    api.post('/glossaire', data),

  mettreAJour: (
    id: number,
    data: {
      termeFr?: string;
      termeEn?: string;
      domaine?: string;
      contexte?: string;
      actif?: boolean;
    }
  ) => api.patch(`/glossaire/${id}`, data),

  desactiver: (id: number) => api.patch(`/glossaire/${id}/desactiver`),

  importerCSV: (
    termes: Array<{
      termeFr: string;
      termeEn: string;
      domaine?: string;
      contexte?: string;
    }>
  ) => api.post('/glossaire/import', { termes }),
};
