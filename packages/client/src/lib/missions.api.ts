import api from './axios';

export type MissionStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type RecommandationStatut = 'en_attente' | 'en_cours' | 'realisee';
export type LogistiqueStatut = 'a_planifier' | 'en_cours' | 'confirme';

export const missionsApi = {
  // ── Lecture ──────────────────────────────────────────────────────────────

  lister: (params?: {
    search?: string;
    statut?: MissionStatut;
    pays?: string;
    participantId?: number;
    confirmationLogistique?: LogistiqueStatut;
    rapportStatut?: 'disponible' | 'manquant';
    page?: number;
    pageSize?: number;
  }) => api.get('/missions', { params }),

  getById: (id: number) => api.get(`/missions/${id}`),

  // Compteurs globaux, indépendants des filtres courants (cartes de synthèse)
  // — ou scopés à un participant (ex. l'espace de travail agent)
  aggregates: (params?: { participantId?: number }) => api.get('/missions/aggregates', { params }),

  // Recommandations en attente avec date limite — dashboard M9
  recommandationsEnAttente: () => api.get('/missions/recommandations/en-attente'),

  // Export PDF — téléchargement direct (cookie httpOnly transmis automatiquement)
  getUrlExportPDF: (id: number) => `/api/missions/${id}/export/pdf`,

  // ── Création ─────────────────────────────────────────────────────────────

  creer: (data: {
    titre: string;
    destination: string;
    pays: string;
    dateDebut: string;
    dateFin: string;
    participantsIds?: number[];
    contactSurPlaceId?: number;
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
      rapportDocumentId?: number | null; // null clears a mistakenly-linked report
      logistiqueBilletReserve?: boolean;
      logistiqueHebergementConfirme?: boolean;
      logistiqueFinancementValide?: boolean;
      contactSurPlaceId?: number | null; // null clears a mistakenly-set contact
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
