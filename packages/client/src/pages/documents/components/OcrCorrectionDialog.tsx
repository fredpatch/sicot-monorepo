// packages/client/src/pages/documents/components/OcrCorrectionDialog.tsx  (corrected)
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ocrSchema, type OcrFormData } from '../documents.schemas';
import type { Document } from '../documents.types';

interface OcrCorrectionDialogProps {
  document: Document | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (texte: string) => void;
  chargement: boolean;
  t: (key: string) => string;
}

export function OcrCorrectionDialog({
  document,
  onOpenChange,
  onSubmit,
  chargement,
  t,
}: OcrCorrectionDialogProps) {
  const form = useForm<OcrFormData>({
    resolver: zodResolver(ocrSchema),
    defaultValues: { texte: '' },
  });

  useEffect(() => {
    if (document) form.reset({ texte: '' });
  }, [document?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog
      open={!!document}
      onOpenChange={(open) => {
        if (!open) form.reset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Correction OCR</DialogTitle>
          <DialogDescription>
            {document?.nomOriginal} — Saisissez ou collez le texte correct extrait de ce document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((data) => onSubmit(data.texte))} noValidate>
          <DialogBody>
            <div className="space-y-1.5">
              <Label htmlFor="ocr-texte">Texte corrigé</Label>
              <textarea
                id="ocr-texte"
                {...form.register('texte')}
                rows={12}
                className="input font-mono text-xs resize-none"
                placeholder="Texte extrait corrigé..."
                aria-invalid={!!form.formState.errors.texte}
              />
              {form.formState.errors.texte && (
                <p className="text-[11px] text-anac-danger">
                  {form.formState.errors.texte.message}
                </p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={chargement} className="gap-2">
              {chargement ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
