// packages/client/src/pages/utilisateurs/hooks/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '@/lib/users.api';
import type { CreerUtilisateurFormData, ModifierUtilisateurFormData } from '../users.schemas';

interface UseUtilisateursMutationsParams {
  utilisateurSelectionneId?: number;
  onCree?: () => void;
  onModifie?: () => void;
}

export function useUtilisateursMutations({
  utilisateurSelectionneId,
  onCree,
  onModifie,
}: UseUtilisateursMutationsParams = {}) {
  const queryClient = useQueryClient();
  const invalidateUtilisateurs = () => queryClient.invalidateQueries({ queryKey: ['utilisateurs'] });

  const creerMutation = useMutation({
    mutationFn: (data: CreerUtilisateurFormData) => usersApi.creer(data),
    onSuccess: (res) => {
      invalidateUtilisateurs();
      onCree?.();
      if (!res.data.emailEnvoye) {
        toast.warning(
          "Compte créé, mais l'OTP n'a pas pu être envoyé par email - vérifiez la configuration SMTP ou réinitialisez l'OTP manuellement."
        );
      }
    },
  });

  const modifierMutation = useMutation({
    mutationFn: (data: ModifierUtilisateurFormData) => usersApi.mettreAJour(utilisateurSelectionneId!, data),
    onSuccess: () => {
      invalidateUtilisateurs();
      onModifie?.();
    },
  });

  const toggleActivationMutation = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) => usersApi.toggleActivation(id, actif),
    onSuccess: invalidateUtilisateurs,
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors du changement de statut.";
      toast.error(msg);
    },
  });

  const reinitialiserOTPMutation = useMutation({
    mutationFn: (id: number) => usersApi.reinitialiserOTP(id),
    onSuccess: (res) => {
      if (res.data.emailEnvoye) {
        toast.success('OTP réinitialisé et envoyé par email.');
      } else {
        toast.warning(res.data.message);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de la réinitialisation.";
      toast.error(msg);
    },
  });

  return { creerMutation, modifierMutation, toggleActivationMutation, reinitialiserOTPMutation };
}