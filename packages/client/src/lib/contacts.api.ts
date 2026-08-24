import api from './axios';

export interface ContactListItem {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  organisationId: number;
  organisationNom: string;
}

export const contactsApi = {
  lister: (params?: { search?: string; actif?: boolean; pageSize?: number }) =>
    api.get('/contacts', { params }),
};
