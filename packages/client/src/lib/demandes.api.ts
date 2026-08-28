import api from './axios';

export type DemandeStatut = 'soumise' | 'en_cours' | 'en_relecture' | 'validee' | 'archivee';
export type DemandePriorite = 'normale' | 'urgente';
export type DemandeDirection = 'fr_en' | 'en_fr';

export interface DemandesAggregates {
  total: number;
  aAssigner: number;
  enCours: number;
  enRelecture: number;
  validees: number;
  archivees: number;
  urgentes: number;
  normales: number;
}

export const demandesApi = {
  lister: (params?: {
    statut?: DemandeStatut;
    priorite?: DemandePriorite;
    direction?: DemandeDirection;
    demandeurId?: number;
    traducteurId?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/demandes', { params }),

  // Compteurs globaux, indépendants des filtres courants - ou scopés à un
  // demandeur (ex. l'espace de travail agent)
  aggregates: (params?: { demandeurId?: number }) => api.get('/demandes/aggregates', { params }),

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
