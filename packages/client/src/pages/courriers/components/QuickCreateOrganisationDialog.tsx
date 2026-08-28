import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { organisationsApi } from '@/lib/organisations.api';
import { FormulaireOrganisation } from '@/pages/partenaires/components/FormulaireOrganisation';
import type { OrgFormData } from '@/pages/partenaires/partenaires.schemas';

interface OrganisationCreee {
  id: number;
  nom: string;
  pays: string;
}

// Reuses the exact FormulaireOrganisation the admin Partenaires page uses,
// rather than a parallel creation path - same pattern as Missions'
// quick-create dialogs.
export function QuickCreateOrganisationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (organisation: OrganisationCreee) => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: OrgFormData) => organisationsApi.creer(data),
    onSuccess: (res) => {
      const org = res.data as OrganisationCreee;
      queryClient.invalidateQueries({ queryKey: ['organisations-liste'] });
      onCreated(org);
      onOpenChange(false);
      toast.success(`Organisation "${org.nom}" créée.`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de la création de l'organisation.";
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle organisation</DialogTitle>
          <DialogDescription>
            Créez le partenaire à sélectionner comme interlocuteur.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FormulaireOrganisation
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => onOpenChange(false)}
            chargement={createMutation.isPending}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
