// packages/client/src/pages/traductions/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { traductionsApi } from '@/lib/traductions.api';

export function useTraductionsMutations() {
  const queryClient = useQueryClient();

  const supprimerMutation = useMutation({
    mutationFn: (id: number) => traductionsApi.supprimer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['traductions'] }),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la suppression.';
      toast.error(msg);
    },
  });

  return { supprimerMutation };
}
