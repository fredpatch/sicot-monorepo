import api from './axios';

export const documentsApi = {
  lister: (params?: {
    search?: string;
    categorie?: string;
    statutOCR?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/documents', { params }),

  getById: (id: number) => api.get(`/documents/${id}`),

  // Upload avec FormData — timeout plus long pour les gros fichiers
  upload: (fichier: File, categorie?: string) => {
    const formData = new FormData();
    formData.append('file', fichier);
    if (categorie) formData.append('categorie', categorie);

    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes pour les gros PDF avec OCR
    });
  },

  nouvelleVersion: (parentId: number, fichier: File) => {
    const formData = new FormData();
    formData.append('file', fichier);

    return api.post(`/documents/${parentId}/nouvelle-version`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  corrigerOCR: (id: number, texte: string) => api.patch(`/documents/${id}/ocr`, { texte }),

  mettreAJourCategorie: (id: number, categorie: string) =>
    api.patch(`/documents/${id}/categorie`, { categorie }),

  getUrlTelechargement: (id: number) => `/api/documents/${id}/telecharger`,

  verifierDoublon: (hash: string) => api.get('/documents/doublon', { params: { hash } }),

  supprimer: (id: number) => api.delete(`/documents/${id}`),
  restaurer: (id: number) => api.patch(`/documents/${id}/restaurer`),
  retraiterOCR: (id: number) => api.post(`/documents/${id}/retraiter-ocr`),
};
