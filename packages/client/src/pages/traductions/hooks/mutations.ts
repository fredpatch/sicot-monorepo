// packages/client/src/pages/traductions/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { traductionsApi } from '@/lib/traductions.api';

function extractMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

export function useTraductionsMutations() {
  const queryClient = useQueryClient();

  function invalidateListe() {
    queryClient.invalidateQueries({ queryKey: ['traductions'] });
    queryClient.invalidateQueries({ queryKey: ['traductions-aggregates'] });
  }

  const supprimerMutation = useMutation({
    mutationFn: (id: number) => traductionsApi.supprimer(id),
    onSuccess: invalidateListe,
    onError: (err: unknown) => toast.error(extractMessage(err, 'Erreur lors de la suppression.')),
  });

  const restaurerMutation = useMutation({
    mutationFn: (id: number) => traductionsApi.restaurer(id),
    onSuccess: () => {
      invalidateListe();
      toast.success('Traduction restaurée.');
    },
    onError: (err: unknown) => toast.error(extractMessage(err, 'Erreur lors de la restauration.')),
  });

  return { supprimerMutation, restaurerMutation };
}
