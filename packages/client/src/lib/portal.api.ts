import api from './axios';
import axios from 'axios';

// Instance sans auth pour les routes publiques
const publicApi = axios.create({ baseURL: '/api' });

export const portalApi = {
  // Routes publiques - pas de cookie auth
  lister: (params?: { search?: string; categorie?: string; page?: number; pageSize?: number }) =>
    publicApi.get('/portal/documents', { params }),

  getAggregates: () => publicApi.get('/portal/documents/aggregates'),

  getDocument: (id: number) => publicApi.get(`/portal/documents/${id}`),

  getUrlConsultation: (id: number) => `/api/portal/documents/${id}/consulter`,

  // Pré-vérification avant d'afficher l'iframe PDF - un iframe ne déclenche
  // pas onError de façon fiable sur un statut HTTP non-2xx (document retiré/
  // introuvable), contrairement à <img>. Une requête HEAD légère permet
  // d'afficher un état d'échec propre plutôt qu'un cadre vide (§28/29).
  verifierConsultation: (id: number) => publicApi.head(`/portal/documents/${id}/consulter`),

  genererToken: (id: number, email: string) =>
    publicApi.post(`/portal/documents/${id}/token`, { email }),

  getUrlTelechargement: (token: string) => `/api/portal/telecharger/${token}`,

  // Récupère le fichier en blob plutôt qu'une navigation top-level, pour
  // pouvoir afficher un état d'erreur normalisé (lien expiré/invalide) au
  // lieu de laisser le navigateur afficher le JSON d'erreur brut du serveur.
  telechargerAvecToken: (token: string) =>
    publicApi.get(`/portal/telecharger/${token}`, { responseType: 'blob' }),

  // Routes admin - avec auth
  toggleVisibilite: (id: number, visible: boolean, portailTokenDureeJours?: number) =>
    api.patch(`/portal/documents/${id}/visibilite`, { visible, portailTokenDureeJours }),
};
