import api from './axios';

export const authApi = {
  login: (matricule: string, otp?: string, motDePasse?: string) =>
    api.post('/auth/login', { matricule, otp, motDePasse }),

  setPassword: (motDePasse: string, confirmation: string) =>
    api.post('/auth/set-password', { motDePasse, confirmation }),

  refresh: () => api.post('/auth/refresh'),

  logout: () => api.post('/auth/logout'),

  me: () => api.get('/auth/me'),
};
