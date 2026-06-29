import api from './axios';

export type AccordStatut = 'actif' | 'expire' | 'suspendu' | 'en_renouvellement';

export const accordsApi = {
  // ── Lecture ──────────────────────────────────────────────────────────────

  lister: (params?: {
    search?: string;
    statut?: AccordStatut;
    partenairesId?: number;
    expirantAvant?: string; // ISO date string
    page?: number;
    pageSize?: number;
  }) => api.get('/accords', { params }),

  getById: (id: number) => api.get(`/accords/${id}`),

  // Accords expirant dans les N prochains jours — dashboard M9
  expirantBientot: (jours?: number) =>
    api.get('/accords/expirant', { params: jours !== undefined ? { jours } : undefined }),

  // ── Création ─────────────────────────────────────────────────────────────

  creer: (data: {
    titre: string;
    dateSignature: string; // ISO date string
    dateExpiration?: string;
    partenairesIds: number[];
    documentId?: number;
    notes?: string;
  }) => api.post('/accords', data),

  // ── Modification ─────────────────────────────────────────────────────────

  mettreAJour: (
    id: number,
    data: {
      titre?: string;
      statut?: AccordStatut;
      dateSignature?: string;
      dateExpiration?: string;
      partenairesIds?: number[];
      documentId?: number;
      notes?: string;
    }
  ) => api.patch(`/accords/${id}`, data),

  // ── Renouvellement ────────────────────────────────────────────────────────
  // Crée une nouvelle version liée à l'accord parent

  renouveler: (
    id: number,
    data: {
      dateSignature: string;
      dateExpiration?: string;
      notes?: string;
    }
  ) => api.post(`/accords/${id}/renouveler`, data),
};
