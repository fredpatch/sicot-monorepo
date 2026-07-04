import api from './axios';

export interface PeriodeParams {
  dateDebut?: string;
  dateFin?: string;
}

export interface GenererRapportPayload {
  periodeDebut: string;
  periodeFin: string;
  modules: string[];
  format: 'pdf' | 'excel';
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
  getUrlExport: (module: string, format: 'excel' | 'csv', params: PeriodeParams) => {
    const query = new URLSearchParams({ module, format });
    if (params.dateDebut) query.set('dateDebut', params.dateDebut);
    if (params.dateFin) query.set('dateFin', params.dateFin);
    return `/api/analytics/export?${query.toString()}`;
  },
  genererRapport: (payload: GenererRapportPayload) => api.post('/analytics/rapports', payload),
  listerRapports: () => api.get('/analytics/rapports'),
  genererAnalyseIA: (rapportId: number) => api.post(`/analytics/rapports/${rapportId}/analyse-ia`),
  getRapport: (rapportId: number) => api.get(`/analytics/rapports/${rapportId}`),
  validerAnalyseIA: (
    rapportId: number,
    payload: { statutRelectureIA: 'valide' | 'rejete'; contenuIAValide?: string }
  ) => api.patch(`/analytics/rapports/${rapportId}/analyse-ia`, payload),
  getStatutGemini: () => api.get('/analytics/gemini-usage'),
};

export interface StatutGemini {
  modeles: {
    modele: string;
    appelsAujourdhui: number;
    plafond: number;
    thinkingTokensAujourdhui: number;
  }[];
  rapportsIA: { utilises: number; max: number };
  dernierRapportMensuel: { createdAt: string; documentId: number } | null;
}
