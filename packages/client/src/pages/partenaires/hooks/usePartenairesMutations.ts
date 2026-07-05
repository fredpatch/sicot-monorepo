import { useMutation, useQueryClient } from '@tanstack/react-query';

import { organisationsApi } from '@/lib/organisations.api';
import type { OrgFormData, ContactFormData } from '../partenaires.schemas';

interface UsePartenairesMutationsParams {
  voirContactsId?: number;
  onOrganisationCreee: () => void;
  onOrganisationModifiee: () => void;
  onContactCree: () => void;
}

export function usePartenairesMutations({
  voirContactsId,
  onOrganisationCreee,
  onOrganisationModifiee,
  onContactCree,
}: UsePartenairesMutationsParams) {
  const queryClient = useQueryClient();

  const creerOrgMutation = useMutation({
    mutationFn: (data: OrgFormData) =>
      organisationsApi.creer({
        nom: data.nom,
        pays: data.pays,
        region: data.region,
        type: data.type,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      onOrganisationCreee();
    },
  });

  const modifierOrgMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrgFormData }) =>
      organisationsApi.mettreAJour(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      onOrganisationModifiee();
    },
  });

  const creerContactMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      organisationsApi.creerContact(voirContactsId!, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || undefined,
        telephone: data.telephone,
        poste: data.poste,
        principal: data.principal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', voirContactsId] });
      onContactCree();
    },
  });

  const definirPrincipalMutation = useMutation({
    mutationFn: (contactId: number) => organisationsApi.definirContactPrincipal(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', voirContactsId] });
    },
  });

  return {
    creerOrgMutation,
    modifierOrgMutation,
    creerContactMutation,
    definirPrincipalMutation,
  };
}
