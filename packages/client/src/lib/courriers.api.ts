import api from './axios';

export type CourrierDirection = 'entrant' | 'sortant';
export type CourrierReponseStatut = 'oui' | 'non' | 'pour_information';
export type CourrierSuiviStatut = 'en_attente' | 'repondu' | 'archive';

export const courriersApi = {
  // ── Lecture ──────────────────────────────────────────────────────────────

  lister: (params?: {
    search?: string;
    direction?: CourrierDirection;
    suiviStatut?: CourrierSuiviStatut;
    reponseRequise?: CourrierReponseStatut;
    sansReponse?: boolean;
    organisationId?: number;
    page?: number;
    pageSize?: number;
  }) => api.get('/courriers', { params }),

  getById: (id: number) => api.get(`/courriers/${id}`),

  // Fil de correspondance — réponses liées à un courrier entrant
  getFilCorrespondance: (id: number) => api.get(`/courriers/${id}/fil`),

  // Courriers entrants sans réponse — dashboard M9
  sansReponse: () => api.get('/courriers/sans-reponse'),

  // ── Création ─────────────────────────────────────────────────────────────

  creer: (data: {
    direction: CourrierDirection;
    objet: string;
    dateReception: string; // ISO date string
    reponseRequise: CourrierReponseStatut;
    expediteurOrganisationId?: number;
    destinataireOrganisationId?: number;
    dateLimiteReponse?: string;
    reponseAId?: number; // fil de correspondance
    accordId?: number;
    missionId?: number;
    documentId?: number;
  }) => api.post('/courriers', data),

  // ── Modification ─────────────────────────────────────────────────────────

  mettreAJour: (
    id: number,
    data: {
      objet?: string;
      suiviStatut?: CourrierSuiviStatut;
      dateLimiteReponse?: string;
      accordId?: number;
      missionId?: number;
      documentId?: number;
    }
  ) => api.patch(`/courriers/${id}`, data),
};
