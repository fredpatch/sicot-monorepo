import api from './axios';

export const auditApi = {
  lister: (params?: {
    userId?: number;
    module?: string;
    action?: string;
    dateDebut?: string;
    dateFin?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/audit', { params }),

  getById: (id: number) => api.get(`/audit/${id}`),

  getModules: () => api.get('/audit/meta/modules'),

  getActions: () => api.get('/audit/meta/actions'),
};
