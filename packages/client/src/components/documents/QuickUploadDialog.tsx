// packages/client/src/components/documents/QuickUploadDialog.tsx
//
// Reusable upload dialog - uploads a file via the existing POST
// /documents/upload (open to any authenticated role, no gating) and hands
// the created document back to the caller via onUploaded. Deliberately
// generic: it doesn't know what happens after upload - the caller decides
// (select it on a form, link it to a mission as a report, etc.), so the
// same dialog serves the Demandes source-picker and the Mon espace mission
// report cards without duplicating upload logic.
import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { documentsApi } from '@/lib/documents.api';
import type { Categorie } from '@/pages/documents/documents.types';

export interface UploadedDocument {
  id: number;
  nomOriginal: string;
  mimeType: string;
  statutOCR: string;
}

interface QuickUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  categorie: Exclude<Categorie, 'tous'>;
  accept?: string;
  onUploaded: (document: UploadedDocument) => void;
}

export function QuickUploadDialog({
  open,
  onOpenChange,
  title,
  description,
  categorie,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff',
  onUploaded,
}: QuickUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await documentsApi.upload(file, categorie);
      const { document } = res.data as { document: UploadedDocument; doublon?: boolean };
      onUploaded(document);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Erreur lors de l'upload. Vérifiez le fichier et réessayez."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="rounded-md border border-dashed border-anac-border px-5 py-8 text-center">
            <Upload size={22} className="mx-auto text-anac-blue" aria-hidden="true" />
            <p className="mt-3 font-semibold text-anac-navy">Déposer un fichier</p>
            <p className="mt-1 text-sm text-anac-muted">PDF, Word, image ou TIFF.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Envoi...
                </>
              ) : (
                'Choisir un fichier'
              )}
            </Button>
            {error && <p className="mt-3 text-sm text-anac-danger">{error}</p>}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileChange}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
