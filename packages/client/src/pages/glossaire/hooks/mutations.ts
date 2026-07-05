// packages/client/src/pages/glossaire/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { glossaireApi } from '@/lib/glossaire.api';
import type { TermeFormData } from '../glossary.schemas';

interface UseGlossaireMutationsParams {
  termeSelectionneId?: number;
  onTermeCree?: () => void;
  onTermeModifie?: () => void;
}

export function useGlossaireMutations({
  termeSelectionneId,
  onTermeCree,
  onTermeModifie,
}: UseGlossaireMutationsParams = {}) {
  const queryClient = useQueryClient();
  const invalidateGlossaire = () => queryClient.invalidateQueries({ queryKey: ['glossaire'] });

  const creerMutation = useMutation({
    mutationFn: (data: TermeFormData) => glossaireApi.creer(data),
    onSuccess: () => {
      invalidateGlossaire();
      onTermeCree?.();
    },
  });

  const modifierMutation = useMutation({
    mutationFn: (data: TermeFormData) => glossaireApi.mettreAJour(termeSelectionneId!, data),
    onSuccess: () => {
      invalidateGlossaire();
      onTermeModifie?.();
    },
  });

  const desactiverMutation = useMutation({
    mutationFn: (id: number) => glossaireApi.desactiver(id),
    onSuccess: invalidateGlossaire,
  });

  return { creerMutation, modifierMutation, desactiverMutation };
}
