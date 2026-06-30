import api from './axios';

export type ParametreType = 'entier' | 'booleen' | 'texte';

export const parametresApi = {
  lister: (module?: string) => api.get('/parametres', { params: { module } }),
  getByCle: (cle: string) => api.get(`/parametres/${cle}`),
  mettreAJour: (cle: string, valeur: string | number | boolean) =>
    api.patch(`/parametres/${cle}`, { valeur }),
};
