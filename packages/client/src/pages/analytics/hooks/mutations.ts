// packages/client/src/pages/analytics/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/analytics.api';

interface UseAnalyticsRapportsMutationsParams {
  texteEdite: string;
  onRapportValide?: () => void;
}

export function useAnalyticsRapportsMutations({
  texteEdite,
  onRapportValide,
}: UseAnalyticsRapportsMutationsParams) {
  const queryClient = useQueryClient();
  const invalidateRapports = () =>
    queryClient.invalidateQueries({ queryKey: ['analytics-rapports'] });

  const genererIA = useMutation({
    mutationFn: (rapportId: number) => analyticsApi.genererAnalyseIA(rapportId),
    onSuccess: invalidateRapports,
    onError: (err: unknown) => {
      console.error('Échec génération analyse IA :', err);
    },
  });

  const validerIA = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: 'valide' | 'rejete' }) =>
      analyticsApi.validerAnalyseIA(id, { statutRelectureIA: statut, contenuIAValide: texteEdite }),
    onSuccess: () => {
      invalidateRapports();
      onRapportValide?.();
    },
  });

  const generation = useMutation({
    mutationFn: async (payload: {
      periodeDebut: string;
      periodeFin: string;
      modules: string[];
      format: 'pdf' | 'excel';
    }) => {
      const res = await analyticsApi.genererRapport(payload);
      return res.data as { rapportId: number; documentId: number };
    },
    onSuccess: invalidateRapports,
  });

  return { genererIA, validerIA, generation };
}
