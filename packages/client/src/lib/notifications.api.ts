import api from './axios';

export type NotificationType = 'accord_echeance' | 'courrier_relance' | 'recommandation_rappel';

export const notificationsApi = {
  envoyer: (data: {
    type: NotificationType;
    entiteId: number;
    destinataireEmail: string;
    destinataireNom?: string;
    objet: string;
    message: string;
  }) => api.post('/notifications/envoyer', data),

  historiqueEntite: (type: NotificationType, entiteId: number) =>
    api.get(`/notifications/historique/${type}/${entiteId}`),

  recentes: (limite?: number) => api.get('/notifications/recentes', { params: { limite } }),
};
