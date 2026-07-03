import api from './axios';

export interface PeriodeParams {
  dateDebut?: string;
  dateFin?: string;
}

export const analyticsApi = {
  global: (params: PeriodeParams) => api.get('/analytics/global', { params }),
  accords: (params: PeriodeParams) => api.get('/analytics/accords', { params }),
  courriers: (params: PeriodeParams) => api.get('/analytics/courriers', { params }),
  missions: (params: PeriodeParams) => api.get('/analytics/missions', { params }),
  traductions: (params: PeriodeParams) => api.get('/analytics/traductions', { params }),
  demandes: (params: PeriodeParams) => api.get('/analytics/demandes', { params }),
  documents: (params: PeriodeParams) => api.get('/analytics/documents', { params }),
  glossaire: (params: PeriodeParams) => api.get('/analytics/glossaire', { params }),
};
