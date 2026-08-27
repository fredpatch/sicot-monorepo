// packages/client/src/pages/admin/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parametresApi } from '@/lib/parametres.api';
import { jobsApi } from '@/lib/api';
import type { JobResultat } from '../admin.types';

export function useMettreAJourParametreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cle, valeur }: { cle: string; valeur: string }) => parametresApi.mettreAJour(cle, valeur),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la mise à jour.'
      );
    },
  });
}

// Le serveur renvoie un JobResultat aussi bien en succès (200) qu'en échec
// d'exécution (502, cf. jobs.controller.ts) — axios rejette donc sur 502,
// avec le même JobResultat disponible dans err.response.data. L'appelant
// (JobsList.tsx) branche ses propres onSuccess/onError par exécution pour
// stocker le résultat localement, quel que soit le statut HTTP.
export function useExecuterJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cle: string) => jobsApi.executer(cle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-historique'] });
    },
  });
}

export type { JobResultat };
