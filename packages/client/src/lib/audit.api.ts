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

  // ── Exports ────────────────────────────────────────────────────────────
  // Retournent une URL, pas une promesse : le téléchargement se déclenche
  // par navigation directe (cookie httpOnly transmis automatiquement),
  // même schéma que documents.api.ts / portal.api.ts.
  getUrlExportPDF: (params: {
    module?: string;
    action?: string;
    dateDebut?: string;
    dateFin?: string;
  }) =>
    `/api/audit/export/pdf?${new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString()}`,

  getUrlExportExcel: (params: {
    module?: string;
    action?: string;
    dateDebut?: string;
    dateFin?: string;
  }) =>
    `/api/audit/export/excel?${new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString()}`,
};
