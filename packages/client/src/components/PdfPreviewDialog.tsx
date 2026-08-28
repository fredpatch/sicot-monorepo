import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  titre: string;
}

// ── Aperçu PDF avant téléchargement - même URL d'export, disposition
// "inline" demandée via ?apercu=1 pour que le navigateur affiche le PDF
// dans l'iframe plutôt que de forcer un téléchargement ────────────────────
export function PdfPreviewDialog({ open, onOpenChange, url, titre }: PdfPreviewDialogProps) {
  const [loaded, setLoaded] = useState(false);
  const previewUrl = `${url}${url.includes('?') ? '&' : '?'}apercu=1`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setLoaded(false);
      }}
    >
      <DialogContent className="flex h-[88vh] w-[92vw] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 pr-12">
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 bg-anac-gray">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-anac-muted">
              <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
              Chargement de l&apos;aperçu...
            </div>
          )}
          {open && (
            <iframe
              src={previewUrl}
              title={`Aperçu - ${titre}`}
              className="h-full w-full border-0"
              onLoad={() => setLoaded(true)}
            />
          )}
        </div>
        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={() => window.open(url, '_blank')}
            className="gap-2 bg-anac-blue"
          >
            <Download size={14} aria-hidden="true" />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
