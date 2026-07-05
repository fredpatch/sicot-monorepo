// packages/client/src/pages/documents/components/PortailDialog.tsx
import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';

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
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Document } from '../documents.types';

interface PortailDialogProps {
  document: Document | null;
  onOpenChange: (open: boolean) => void;
  onPublier: (dureeJours?: number) => void;
  chargement: boolean;
}

export function PortailDialog({
  document,
  onOpenChange,
  onPublier,
  chargement,
}: PortailDialogProps) {
  const [dureeToken, setDureeToken] = useState<string>('30');

  return (
    <Dialog
      open={!!document}
      onOpenChange={(open) => {
        if (!open) setDureeToken('30');
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe size={15} className="text-anac-sky" />
            Exposer sur le portail
          </DialogTitle>
          <DialogDescription>{document?.nomOriginal}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label>Durée de validité des liens de téléchargement</Label>
            <Select value={dureeToken} onValueChange={setDureeToken}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
                <SelectItem value="0">Sans expiration</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-anac-muted">
              Durée de validité des liens envoyés aux utilisateurs externes qui demandent le
              téléchargement.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-2.5 text-xs">
            Le document sera visible par tous les visiteurs du portail externe. La consultation est
            libre, le téléchargement nécessite un email.
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => onPublier(dureeToken === '0' ? undefined : parseInt(dureeToken))}
            disabled={chargement}
            className="gap-2"
          >
            {chargement ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Publication...
              </>
            ) : (
              <>
                <Globe size={13} /> Publier sur le portail
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
