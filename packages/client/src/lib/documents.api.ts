import api from './axios';

export const documentsApi = {
  lister: (params?: {
    search?: string;
    categorie?: string;
    statutOCR?: string;
    page?: number;
    pageSize?: number;
    // Ne garder que la dernière version de chaque document (voir
    // documents.service.ts#listerDocuments côté serveur pour la définition).
    finalesUniquement?: boolean;
  }) =>
    api.get('/documents', {
      params: { ...params, finalesUniquement: params?.finalesUniquement ? '1' : undefined },
    }),

  getById: (id: number) => api.get(`/documents/${id}`),

  aggregates: () => api.get('/documents/aggregates'),

  // Upload avec FormData — timeout plus long pour les gros fichiers.
  // visibiliteInterne n'est honoré par le serveur que pour operateur+ (un
  // agent ne peut jamais s'auto-publier, même en le passant ici).
  upload: (fichier: File, categorie?: string, visibiliteInterne?: boolean) => {
    const formData = new FormData();
    formData.append('file', fichier);
    if (categorie) formData.append('categorie', categorie);
    if (visibiliteInterne) formData.append('visibiliteInterne', '1');

    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes pour les gros PDF avec OCR
    });
  },

  nouvelleVersion: (parentId: number, fichier: File, categorie?: string) => {
    const formData = new FormData();
    formData.append('file', fichier);
    if (categorie) formData.append('categorie', categorie);

    return api.post(`/documents/${parentId}/nouvelle-version`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  corrigerOCR: (id: number, texte: string) => api.patch(`/documents/${id}/ocr`, { texte }),

  mettreAJourCategorie: (id: number, categorie: string) =>
    api.patch(`/documents/${id}/categorie`, { categorie }),

  toggleVisibiliteInterne: (id: number, visible: boolean) =>
    api.patch(`/documents/${id}/visibilite-interne`, { visible }),

  getUrlTelechargement: (id: number) => `/api/documents/${id}/telecharger`,

  verifierDoublon: (hash: string) => api.get('/documents/doublon', { params: { hash } }),

  supprimer: (id: number) => api.delete(`/documents/${id}`),
  restaurer: (id: number) => api.patch(`/documents/${id}/restaurer`),
  retraiterOCR: (id: number) => api.post(`/documents/${id}/retraiter-ocr`),
};
