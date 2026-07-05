// packages/client/src/pages/demandes/components/NouvelleDemandeDialog.tsx
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, FileText, AlignLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentsOCRTraiteQuery } from '../hooks/queries';
import { demandeSchema, type DemandeFormData } from '../requests.schemas';

interface NouvelleDemandeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DemandeFormData) => void;
  chargement: boolean;
  erreur: string | null;
}

export function NouvelleDemandeDialog({
  open,
  onOpenChange,
  onSubmit,
  chargement,
  erreur,
}: NouvelleDemandeDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DemandeFormData>({
    resolver: zodResolver(demandeSchema),
    defaultValues: {
      direction: 'fr_en',
      priorite: 'normale',
      type: 'document',
    },
  });

  const typeWatched = watch('type');
  const { data: docsData } = useDocumentsOCRTraiteQuery(open && typeWatched === 'document');
  const documents = docsData?.data ?? [];

  useEffect(() => {
    if (!open) reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de traduction</DialogTitle>
          <DialogDescription>
            Soumettez un document ou un texte libre pour traduction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Direction *</Label>
                <Controller
                  name="direction"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr_en">Français → Anglais</SelectItem>
                        <SelectItem value="en_fr">Anglais → Français</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Controller
                  name="priorite"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normale">Normale</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Type de contenu *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="document"
                        checked={field.value === 'document'}
                        onChange={() => {
                          field.onChange('document');
                          setValue('texteLibre', '');
                        }}
                        className="text-anac-sky focus:ring-anac-sky"
                      />
                      <span className="text-sm flex items-center gap-1.5">
                        <FileText size={13} /> Document archivé
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="texte"
                        checked={field.value === 'texte'}
                        onChange={() => {
                          field.onChange('texte');
                          setValue('documentId', undefined);
                        }}
                        className="text-anac-sky focus:ring-anac-sky"
                      />
                      <span className="text-sm flex items-center gap-1.5">
                        <AlignLeft size={13} /> Texte libre
                      </span>
                    </label>
                  </div>
                )}
              />
            </div>

            {typeWatched === 'document' ? (
              <div className="space-y-1.5">
                <Label>Document *</Label>
                <Controller
                  name="documentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? '__none__'}
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? undefined : parseInt(v))
                      }
                    >
                      <SelectTrigger aria-invalid={!!errors.documentId}>
                        <SelectValue placeholder="Sélectionner un document..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Choisir —</SelectItem>
                        {documents.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id.toString()}>
                            {doc.nomOriginal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {documents.length === 0 && (
                  <p className="text-xs text-anac-muted">
                    Aucun document avec OCR traité disponible.
                  </p>
                )}
                {errors.documentId && (
                  <p className="text-[11px] text-anac-danger">{errors.documentId.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="texte-libre">Texte à traduire *</Label>
                <textarea
                  id="texte-libre"
                  {...register('texteLibre')}
                  rows={8}
                  className="input resize-none text-sm font-mono"
                  placeholder="Saisissez le texte à traduire..."
                />
              </div>
            )}

            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {erreur}
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={chargement} className="gap-2">
              {chargement ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Soumission...
                </>
              ) : (
                'Soumettre la demande'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
