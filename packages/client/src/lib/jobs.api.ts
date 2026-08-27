import api from './axios';

export const jobsApi = {
  lister: () => api.get('/jobs'),
  executer: (cle: string) => api.post(`/jobs/${cle}/executer`, {}, { timeout: 60000 }),
  historique: (params?: {
    jobCle?: string;
    module?: string;
    source?: 'manuel' | 'cron';
    succes?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get('/jobs/historique', { params }),
};
