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

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

export function useDemandesMutations({
  onDemandeCreee,
  onCreationErreur,
  onPrioriteValidee,
}: UseDemandesMutationsParams = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const invalidateDemandes = () => {
    queryClient.invalidateQueries({ queryKey: ['demandes'] });
    queryClient.invalidateQueries({ queryKey: ['demandes-aggregates'] });
  };

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
      onCreationErreur?.(errorMessage(err, 'Erreur lors de la création.'));
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
      toast.error(errorMessage(err, 'Erreur lors de la prise en charge.'));
    },
  });

  const rappelerMutation = useMutation({
    mutationFn: (id: number) => demandesApi.rappeler(id),
    onSuccess: invalidateDemandes,
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erreur lors du rappel de la demande.'));
    },
  });

  const passerEnRelectureMutation = useMutation({
    mutationFn: (id: number) => demandesApi.passerEnRelecture(id),
    onSuccess: invalidateDemandes,
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erreur lors de la soumission en relecture.'));
    },
  });

  const validerMutation = useMutation({
    mutationFn: (id: number) => demandesApi.valider(id),
    onSuccess: invalidateDemandes,
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erreur lors de la validation.'));
    },
  });

  const archiverMutation = useMutation({
    mutationFn: (id: number) => demandesApi.archiver(id),
    onSuccess: invalidateDemandes,
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "Erreur lors de l'archivage."));
    },
  });

  const validerPrioriteMutation = useMutation({
    mutationFn: ({ id, priorite }: { id: number; priorite: DemandePriorite }) =>
      demandesApi.validerPriorite(id, priorite),
    onSuccess: () => {
      invalidateDemandes();
      onPrioriteValidee?.();
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, 'Erreur lors de la validation de la priorité.'));
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
