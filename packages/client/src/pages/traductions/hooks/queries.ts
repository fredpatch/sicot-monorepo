// packages/client/src/pages/traductions/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import {
  traductionsApi,
  type TraductionStatut,
  type TraductionDirection,
} from '@/lib/traductions.api';
import type { Traduction } from '../traductions.types';

const PAGE_SIZE = 10;

interface UseTraductionsQueryParams {
  statut: string;
  direction: string;
  page: number;
}

export function useTraductionsQuery({ statut, direction, page }: UseTraductionsQueryParams) {
  return useQuery({
    queryKey: ['traductions', statut, direction, page],
    queryFn: async () => {
      const res = await traductionsApi.lister({
        statut: statut ? (statut as TraductionStatut) : undefined,
        direction: direction ? (direction as TraductionDirection) : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res.data as { data: Traduction[]; total: number };
    },
  });
}

export function useMoteurStatusQuery() {
  return useQuery({
    queryKey: ['traduction-moteur'],
    queryFn: async () => {
      const res = await traductionsApi.moteurStatus();
      return res.data as { accessible: boolean; langues: string[] };
    },
  });
}

export { PAGE_SIZE };
