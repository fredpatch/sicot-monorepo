// packages/client/src/pages/documents/hooks/useDocumentsQueries.ts
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import type { Categorie, Document, DocumentsAggregates } from '../documents.types';

interface UseDocumentsQueryParams {
  search: string;
  categorie: Categorie;
  statutOCR: string;
  page: number;
  finalesUniquement?: boolean;
}

const PAGE_SIZE = 10;

export function useDocumentsQuery({
  search,
  categorie,
  statutOCR,
  page,
  finalesUniquement,
}: UseDocumentsQueryParams) {
  return useQuery({
    queryKey: ['documents', search, categorie, statutOCR, page, finalesUniquement],
    queryFn: async () => {
      const response = await documentsApi.lister({
        search: search || undefined,
        categorie: categorie !== 'tous' ? categorie : undefined,
        statutOCR: statutOCR || undefined,
        page,
        pageSize: PAGE_SIZE,
        finalesUniquement,
      });
      return response.data as { data: Document[]; total: number };
    },
  });
}

export { PAGE_SIZE };

export function useDocumentsAggregatesQuery() {
  return useQuery({
    queryKey: ['documents', 'aggregates'],
    queryFn: async () => {
      const response = await documentsApi.aggregates();
      return response.data as DocumentsAggregates;
    },
  });
}
