import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { FormulaireOrganisation } from './FormulaireOrganisation';
import type { OrgFormData } from '../partenaires.schemas';
import type { Organisation } from '../partenaires.types';

interface OrganisationDialogProps {
  mode: 'creer' | 'modifier' | null;
  organisation: Organisation | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OrgFormData) => void;
  chargement: boolean;
}

export function OrganisationDialog({
  mode,
  organisation,
  onOpenChange,
  onSubmit,
  chargement,
}: OrganisationDialogProps) {
  return (
    <Dialog open={!!mode} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'creer' ? 'Nouvelle organisation' : `Modifier - ${organisation?.nom}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'creer'
              ? 'Renseignez les informations du nouveau partenaire.'
              : 'Modifiez les informations de cette organisation.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FormulaireOrganisation
            key={organisation?.id ?? 'new'}
            initial={organisation ?? undefined}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            chargement={chargement}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
