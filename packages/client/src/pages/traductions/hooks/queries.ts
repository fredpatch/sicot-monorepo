// packages/client/src/pages/traductions/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { traductionsApi, type TraductionsAggregates } from '@/lib/traductions.api';

export function useTraductionsAggregatesQuery() {
  return useQuery({
    queryKey: ['traductions-aggregates'],
    queryFn: async () => {
      const res = await traductionsApi.aggregates();
      return res.data as TraductionsAggregates;
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
