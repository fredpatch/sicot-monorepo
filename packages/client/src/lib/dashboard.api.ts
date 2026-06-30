import api from './axios';

export const dashboardApi = {
  getData: () => api.get('/dashboard'),
};
