import api from './axios';

export const usersApi = {
  lister: (params?: {
    search?: string;
    role?: string;
    actif?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get('/users', { params }),

  getById: (id: number) => api.get(`/users/${id}`),

  aggregates: () => api.get('/users/aggregates'),

  creer: (data: {
    matricule: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    poste?: string | null;
    service?: string | null;
    direction?: string | null;
  }) => api.post('/users', data),

   toggleActivation: (id: number, actif: boolean) => api.patch(`/users/${id}/activation`, { actif }),

  reinitialiserOTP: (id: number) => api.post(`/users/${id}/reinitialiser-otp`),

  // packages/client/src/lib/users.api.ts  (diff)
  mettreAJour: (id: number, data: { role?: string; actif?: boolean; email?: string }) =>
    api.patch(`/users/${id}`, data),
};
