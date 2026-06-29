import api from './axios';

export type MissionStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type RecommandationStatut = 'en_attente' | 'en_cours' | 'realisee';

export const missionsApi = {
  // ── Lecture ──────────────────────────────────────────────────────────────

  lister: (params?: {
    search?: string;
    statut?: MissionStatut;
    pays?: string;
    participantId?: number;
    page?: number;
    pageSize?: number;
  }) => api.get('/missions', { params }),

  getById: (id: number) => api.get(`/missions/${id}`),

  // Recommandations en attente avec date limite — dashboard M9
  recommandationsEnAttente: () => api.get('/missions/recommandations/en-attente'),

  // ── Création ─────────────────────────────────────────────────────────────

  creer: (data: {
    titre: string;
    destination: string;
    pays: string;
    dateDebut: string; // ISO date string
    dateFin: string;
    participantsIds?: number[];
  }) => api.post('/missions', data),

  // ── Modification ─────────────────────────────────────────────────────────

  mettreAJour: (
    id: number,
    data: {
      titre?: string;
      destination?: string;
      pays?: string;
      dateDebut?: string;
      dateFin?: string;
      statut?: MissionStatut;
      participantsIds?: number[];
      rapportDocumentId?: number;
    }
  ) => api.patch(`/missions/${id}`, data),

  // ── Recommandations ───────────────────────────────────────────────────────

  listerRecommandations: (missionId: number) => api.get(`/missions/${missionId}/recommandations`),

  ajouterRecommandation: (
    missionId: number,
    data: {
      texte: string;
      responsableId?: number;
      dateLimite?: string; // ISO date string — sans date limite = pas d'alerte
    }
  ) => api.post(`/missions/${missionId}/recommandations`, data),

  mettreAJourRecommandation: (
    recId: number,
    data: {
      texte?: string;
      responsableId?: number;
      dateLimite?: string;
      statut?: RecommandationStatut;
    }
  ) => api.patch(`/missions/recommandations/${recId}`, data),
};
