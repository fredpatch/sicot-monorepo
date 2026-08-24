// packages/client/src/pages/glossaire/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { glossaireApi } from '@/lib/glossaire.api';
import type { GlossaireAggregates, Terme } from '../glossary.types';

export function useGlossaireAggregatesQuery() {
  return useQuery({
    queryKey: ['glossaire-aggregates'],
    queryFn: async () => {
      const res = await glossaireApi.aggregates();
      return res.data as GlossaireAggregates;
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
