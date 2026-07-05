// packages/client/src/pages/demandes/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { demandesApi, type DemandePriorite } from '@/lib/demandes.api';
import type { DemandeFormData } from '../requests.schemas';

interface UseDemandesMutationsParams {
  onDemandeCreee?: () => void;
  onCreationErreur?: (message: string) => void;
  onPrioriteValidee?: () => void;
}

export function useDemandesMutations({
  onDemandeCreee,
  onCreationErreur,
  onPrioriteValidee,
}: UseDemandesMutationsParams = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const invalidateDemandes = () => queryClient.invalidateQueries({ queryKey: ['demandes'] });

  const creerMutation = useMutation({
    mutationFn: (formData: DemandeFormData) =>
      demandesApi.creer({
        direction: formData.direction,
        priorite: formData.priorite,
        documentId: formData.type === 'document' ? formData.documentId : undefined,
        texteLibre: formData.type === 'texte' ? formData.texteLibre : undefined,
      }),
    onSuccess: () => {
      invalidateDemandes();
      onDemandeCreee?.();
    },
    onError: (err: unknown) => {
      onCreationErreur?.(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la création.'
      );
    },
  });

  const prendreEnChargeMutation = useMutation({
    mutationFn: (id: number) => demandesApi.prendreEnCharge(id),
    onSuccess: (res) => {
      invalidateDemandes();
      if (res.data.traductionId) {
        navigate(`/traductions/${res.data.traductionId}`);
      }
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la prise en charge.'
      );
    },
  });

  const rappelerMutation = useMutation({
    mutationFn: (id: number) => demandesApi.rappeler(id),
    onSuccess: invalidateDemandes,
  });

  const passerEnRelectureMutation = useMutation({
    mutationFn: (id: number) => demandesApi.passerEnRelecture(id),
    onSuccess: invalidateDemandes,
  });

  const validerMutation = useMutation({
    mutationFn: (id: number) => demandesApi.valider(id),
    onSuccess: invalidateDemandes,
  });

  const archiverMutation = useMutation({
    mutationFn: (id: number) => demandesApi.archiver(id),
    onSuccess: invalidateDemandes,
  });

  const validerPrioriteMutation = useMutation({
    mutationFn: ({ id, priorite }: { id: number; priorite: DemandePriorite }) =>
      demandesApi.validerPriorite(id, priorite),
    onSuccess: () => {
      invalidateDemandes();
      onPrioriteValidee?.();
    },
  });

  return {
    creerMutation,
    prendreEnChargeMutation,
    rappelerMutation,
    passerEnRelectureMutation,
    validerMutation,
    archiverMutation,
    validerPrioriteMutation,
  };
}
