import api from './axios';
import axios from 'axios';

// Instance sans auth pour les routes publiques
const publicApi = axios.create({ baseURL: '/api' });

export const portalApi = {
  // Routes publiques — pas de cookie auth
  lister: (params?: { search?: string; categorie?: string; page?: number; pageSize?: number }) =>
    publicApi.get('/portal/documents', { params }),

  getDocument: (id: number) => publicApi.get(`/portal/documents/${id}`),

  getUrlConsultation: (id: number) => `/api/portal/documents/${id}/consulter`,

  genererToken: (id: number, email: string) =>
    publicApi.post(`/portal/documents/${id}/token`, { email }),

  getUrlTelechargement: (token: string) => `/api/portal/telecharger/${token}`,

  // Routes admin — avec auth
  toggleVisibilite: (id: number, visible: boolean, portailTokenDureeJours?: number) =>
    api.patch(`/portal/documents/${id}/visibilite`, { visible, portailTokenDureeJours }),
};
