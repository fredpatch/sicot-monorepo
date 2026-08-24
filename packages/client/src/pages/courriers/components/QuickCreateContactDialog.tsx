import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { organisationsApi } from '@/lib/organisations.api';
import { FormulaireContact } from '@/pages/partenaires/components/FormulaireContact';
import type { ContactFormData } from '@/pages/partenaires/partenaires.schemas';
import type { ContactListItem } from '@/lib/contacts.api';

// Contact-only — the organisation is already chosen by the time this
// opens (unlike Missions' two-layer "contact sur place" dialog, which
// doesn't have an organisation field elsewhere in that form).
export function QuickCreateContactDialog({
  open,
  onOpenChange,
  organisation,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: { id: number; nom: string };
  onCreated: (contact: ContactListItem) => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: ContactFormData) => organisationsApi.creerContact(organisation.id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts-organisation', organisation.id] });
      const contact = res.data as { id: number; nom: string; prenom: string; email?: string; telephone?: string; poste?: string };
      onCreated({ ...contact, organisationId: organisation.id, organisationNom: organisation.nom });
      onOpenChange(false);
      toast.success(`${contact.prenom} ${contact.nom} a été créé(e).`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la création du contact.';
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau contact</DialogTitle>
          <DialogDescription>Chez {organisation.nom}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FormulaireContact
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => onOpenChange(false)}
            chargement={createMutation.isPending}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
