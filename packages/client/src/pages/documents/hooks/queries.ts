// packages/client/src/pages/documents/hooks/useDocumentsQueries.ts
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import type { Categorie, Document } from '../documents.types';

interface UseDocumentsQueryParams {
  search: string;
  categorie: Categorie;
  statutOCR: string;
  page: number;
}

const PAGE_SIZE = 20;

export function useDocumentsQuery({ search, categorie, statutOCR, page }: UseDocumentsQueryParams) {
  return useQuery({
    queryKey: ['documents', search, categorie, statutOCR, page],
    queryFn: async () => {
      const response = await documentsApi.lister({
        search: search || undefined,
        categorie: categorie !== 'tous' ? categorie : undefined,
        statutOCR: statutOCR || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return response.data as { data: Document[]; total: number };
    },
  });
}

export { PAGE_SIZE };
