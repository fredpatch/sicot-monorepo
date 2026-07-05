// packages/client/src/pages/documents/hooks/useDocumentsMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, portalApi } from '@/lib/api';

interface UseDocumentsMutationsParams {
  onOCRCorrigee?: () => void;
  onPortailPublie?: () => void;
}

export function useDocumentsMutations({
  onOCRCorrigee,
  onPortailPublie,
}: UseDocumentsMutationsParams = {}) {
  const queryClient = useQueryClient();
  const invalidateDocuments = () => queryClient.invalidateQueries({ queryKey: ['documents'] });

  const corrigerOCRMutation = useMutation({
    mutationFn: ({ id, texte }: { id: number; texte: string }) =>
      documentsApi.corrigerOCR(id, texte),
    onSuccess: () => {
      invalidateDocuments();
      onOCRCorrigee?.();
    },
  });

  const categoriesMutation = useMutation({
    mutationFn: ({ id, cat }: { id: number; cat: string }) =>
      documentsApi.mettreAJourCategorie(id, cat),
    onSuccess: invalidateDocuments,
  });

  const togglePortailMutation = useMutation({
    mutationFn: ({ id, visible, duree }: { id: number; visible: boolean; duree?: number }) =>
      portalApi.toggleVisibilite(id, visible, duree),
    onSuccess: () => {
      invalidateDocuments();
      onPortailPublie?.();
    },
  });

  const supprimerMutation = useMutation({
    mutationFn: (id: number) => documentsApi.supprimer(id),
    onSuccess: invalidateDocuments,
  });

  const retraiterOCRMutation = useMutation({
    mutationFn: (id: number) => documentsApi.retraiterOCR(id),
    onSuccess: invalidateDocuments,
  });

  return {
    corrigerOCRMutation,
    categoriesMutation,
    togglePortailMutation,
    supprimerMutation,
    retraiterOCRMutation,
  };
}
