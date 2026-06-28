import api from './axios';

export const organisationsApi = {
  lister: (params?: {
    search?: string;
    pays?: string;
    region?: string;
    type?: string;
    actif?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get('/organisations', { params }),

  getById: (id: number) => api.get(`/organisations/${id}`),

  creer: (data: { nom: string; pays: string; region?: string; type: string; notes?: string }) =>
    api.post('/organisations', data),

  mettreAJour: (
    id: number,
    data: {
      nom?: string;
      pays?: string;
      region?: string;
      type?: string;
      actif?: boolean;
      notes?: string;
    }
  ) => api.patch(`/organisations/${id}`, data),

  // Métadonnées pour les filtres
  getPays: () => api.get('/organisations/meta/pays'),

  getRegions: () => api.get('/organisations/meta/regions'),

  // Contacts
  listerContacts: (organisationId: number) => api.get(`/organisations/${organisationId}/contacts`),

  creerContact: (
    organisationId: number,
    data: {
      nom: string;
      prenom: string;
      email?: string;
      telephone?: string;
      poste?: string;
      principal?: boolean;
    }
  ) => api.post(`/organisations/${organisationId}/contacts`, data),

  mettreAJourContact: (
    contactId: number,
    data: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      poste?: string;
      actif?: boolean;
    }
  ) => api.patch(`/organisations/contacts/${contactId}`, data),

  definirContactPrincipal: (contactId: number) =>
    api.patch(`/organisations/contacts/${contactId}/principal`),
};
