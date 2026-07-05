// packages/client/src/pages/glossaire/components/TermeDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { FormulaireTerme } from './TermsForm';
import type { TermeFormData } from '../glossary.schemas';
import type { Terme } from '../glossary.types';

interface TermeDialogProps {
  mode: 'creer' | 'modifier' | null;
  terme: Terme | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TermeFormData) => void;
  chargement: boolean;
}

export function TermeDialog({ mode, terme, onOpenChange, onSubmit, chargement }: TermeDialogProps) {
  return (
    <Dialog open={!!mode} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'creer' ? 'Nouveau terme' : `Modifier — ${terme?.termeFr}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'creer'
              ? 'Ajoutez un nouveau terme au glossaire aéronautique ANAC.'
              : "Modifiez ce terme. L'ancienne valeur sera conservée dans l'historique."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FormulaireTerme
            key={terme?.id ?? 'new'}
            initial={terme ?? undefined}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            chargement={chargement}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
