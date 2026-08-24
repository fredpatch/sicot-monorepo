import api from './axios';

export type CourrierDirection = 'entrant' | 'sortant';
export type CourrierReponseStatut = 'oui' | 'non' | 'pour_information';
export type CourrierSuiviStatut = 'en_attente' | 'repondu' | 'archive';

export interface CourriersAggregates {
  total: number;
  aTraiter: number;
  enAttenteReponse: number;
  enDepassement: number;
  envoyes: number;
}

export const courriersApi = {
  // ── Lecture ──────────────────────────────────────────────────────────────

  lister: (params?: {
    search?: string;
    direction?: CourrierDirection;
    suiviStatut?: CourrierSuiviStatut;
    reponseRequise?: CourrierReponseStatut;
    sansReponse?: boolean;
    enDepassement?: boolean;
    organisationId?: number;
    dateDebut?: string;
    dateFin?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/courriers', { params }),

  getById: (id: number) => api.get(`/courriers/${id}`),

  // Fil de correspondance — réponses liées à un courrier entrant
  getFilCorrespondance: (id: number) => api.get(`/courriers/${id}/fil`),

  // Courriers entrants sans réponse — dashboard M9
  sansReponse: () => api.get('/courriers/sans-reponse'),

  // Compteurs globaux, indépendants des filtres courants (cartes de synthèse)
  aggregates: () => api.get('/courriers/aggregates'),

  // Export PDF — téléchargement direct (cookie httpOnly transmis automatiquement)
  getUrlExportPDF: (id: number) => `/api/courriers/${id}/export/pdf`,

  // ── Création ─────────────────────────────────────────────────────────────

  creer: (data: {
    direction: CourrierDirection;
    objet: string;
    dateReception: string; // ISO date string
    reponseRequise: CourrierReponseStatut;
    expediteurOrganisationId?: number;
    destinataireOrganisationId?: number;
    expediteurContactId?: number;
    destinataireContactId?: number;
    dateLimiteReponse?: string;
    reponseAId?: number; // fil de correspondance
    accordId?: number;
    missionId?: number;
    documentIds?: number[];
  }) => api.post('/courriers', data),

  // ── Modification ─────────────────────────────────────────────────────────

  mettreAJour: (
    id: number,
    data: {
      objet?: string;
      dateReception?: string;
      reponseRequise?: CourrierReponseStatut;
      expediteurOrganisationId?: number;
      destinataireOrganisationId?: number;
      expediteurContactId?: number | null;
      destinataireContactId?: number | null;
      suiviStatut?: CourrierSuiviStatut;
      dateLimiteReponse?: string;
      accordId?: number;
      missionId?: number;
    }
  ) => api.patch(`/courriers/${id}`, data),

  // ── Documents joints ─────────────────────────────────────────────────────

  ajouterDocument: (id: number, documentId: number) =>
    api.post(`/courriers/${id}/documents`, { documentId }),

  retirerDocument: (id: number, documentId: number) =>
    api.delete(`/courriers/${id}/documents/${documentId}`),
};
