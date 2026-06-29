import api from './axios';

export type DemandeStatut = 'soumise' | 'en_cours' | 'en_relecture' | 'validee' | 'archivee';
export type DemandePriorite = 'normale' | 'urgente';
export type DemandeDirection = 'fr_en' | 'en_fr';

export const demandesApi = {
  lister: (params?: {
    statut?: DemandeStatut;
    priorite?: DemandePriorite;
    demandeurId?: number;
    traducteurId?: number;
    page?: number;
    pageSize?: number;
  }) => api.get('/demandes', { params }),

  getById: (id: number) => api.get(`/demandes/${id}`),

  creer: (data: {
    direction: DemandeDirection;
    priorite?: DemandePriorite;
    documentId?: number;
    texteLibre?: string;
  }) => api.post('/demandes', data),

  prendreEnCharge: (id: number) => api.patch(`/demandes/${id}/prendre-en-charge`),

  rappeler: (id: number) => api.patch(`/demandes/${id}/rappeler`),

  validerPriorite: (id: number, priorite: DemandePriorite) =>
    api.patch(`/demandes/${id}/priorite`, { priorite }),

  passerEnRelecture: (id: number) => api.patch(`/demandes/${id}/relecture`),

  valider: (id: number) => api.patch(`/demandes/${id}/valider`),

  archiver: (id: number) => api.patch(`/demandes/${id}/archiver`),
};
