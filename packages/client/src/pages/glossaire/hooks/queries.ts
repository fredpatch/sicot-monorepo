// packages/client/src/pages/glossaire/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { glossaireApi } from '@/lib/glossaire.api';
import type { Terme } from '../glossary.types';

const PAGE_SIZE = 10;

interface UseGlossaireQueryParams {
  search: string;
  domaine: string;
  afficherInactifs: boolean;
  page: number;
}

export function useGlossaireQuery({
  search,
  domaine,
  afficherInactifs,
  page,
}: UseGlossaireQueryParams) {
  return useQuery({
    queryKey: ['glossaire', search, domaine, afficherInactifs, page],
    queryFn: async () => {
      const res = await glossaireApi.lister({
        search: search || undefined,
        domaine: domaine || undefined,
        actif: afficherInactifs ? undefined : true,
        page,
        pageSize: PAGE_SIZE,
      });
      return res.data as { data: Terme[]; total: number; domaines: string[] };
    },
  });
}

export function useTermeDetailQuery(termeId?: number) {
  return useQuery({
    queryKey: ['terme', termeId],
    queryFn: async () => {
      const res = await glossaireApi.getById(termeId!);
      return res.data as Terme;
    },
    enabled: !!termeId,
  });
}

export { PAGE_SIZE };
