// packages/client/src/pages/glossaire/components/form/TermDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { TermForm } from './TermForm';
import type { TermeFormData } from '../../glossary.schemas';
import type { Terme } from '../../glossary.types';

interface TermDialogProps {
  mode: 'creer' | 'modifier' | null;
  terme: Terme | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TermeFormData) => void;
  chargement: boolean;
  erreur?: string | null;
}

export function TermDialog({ mode, terme, onOpenChange, onSubmit, chargement, erreur }: TermDialogProps) {
  return (
    <Dialog open={!!mode} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'creer' ? 'Nouveau terme' : `Modifier — ${terme?.termeFr ?? ''}`}</DialogTitle>
          <DialogDescription>
            {mode === 'creer'
              ? 'Ajoutez un nouveau concept terminologique au glossaire.'
              : "Modifiez les traductions, le domaine ou le contexte de ce terme."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TermForm
            initial={mode === 'modifier' ? terme ?? undefined : undefined}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            chargement={chargement}
            erreur={erreur}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
