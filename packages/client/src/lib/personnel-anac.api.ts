// packages/client/src/lib/personnel-anac.api.ts
import api from './axios';

export const personnelAnacApi = {
  rechercher: (q: string) => api.get('/personnel-anac/rechercher', { params: { q } }),

  lister: (params?: { page?: number; limit?: number; sortBy?: 'id' | 'lastName'; order?: 'asc' | 'desc' }) =>
    api.get('/personnel-anac', { params }),

  getParMatricule: (matricule: string) => api.get(`/personnel-anac/matricule/${matricule}`),
};