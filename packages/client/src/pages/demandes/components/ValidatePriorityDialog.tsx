// packages/client/src/pages/demandes/components/ValiderPrioriteDialog.tsx
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import type { DemandePriorite } from '@/lib/demandes.api';
import type { Demande } from '../requests.types';

interface ValiderPrioriteDialogProps {
  demande: Demande | null;
  onOpenChange: (open: boolean) => void;
  onConfirmer: (priorite: DemandePriorite) => void;
  chargement: boolean;
}

export function ValiderPrioriteDialog({
  demande,
  onOpenChange,
  onConfirmer,
  chargement,
}: ValiderPrioriteDialogProps) {
  const [nouvellePriorite, setNouvellePriorite] = useState<DemandePriorite>('normale');

  useEffect(() => {
    if (demande) setNouvellePriorite(demande.prioriteDemandee);
  }, [demande?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!demande} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Valider la priorité</DialogTitle>
          <DialogDescription>
            Priorité demandée : <strong>{demande?.prioriteDemandee}</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Label>Priorité validée</Label>
          <Select
            value={nouvellePriorite}
            onValueChange={(v) => setNouvellePriorite(v as DemandePriorite)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normale">Normale</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => onConfirmer(nouvellePriorite)}
            disabled={chargement}
            className="gap-2"
          >
            {chargement ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Validation...
              </>
            ) : (
              'Confirmer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
