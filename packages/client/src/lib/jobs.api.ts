import api from './axios';

export const jobsApi = {
  lister: () => api.get('/jobs'),
  executer: (cle: string) => api.post(`/jobs/${cle}/executer`, {}, { timeout: 60000 }),
};
