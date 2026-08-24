// packages/client/src/pages/glossaire/components/form/TermForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { termeSchema, type TermeFormData } from '../../glossary.schemas';
import type { Terme } from '../../glossary.types';

interface TermFormProps {
  initial?: Partial<Terme>;
  onSubmit: (data: TermeFormData) => void;
  onCancel: () => void;
  chargement: boolean;
  erreur?: string | null;
}

export function TermForm({ initial, onSubmit, onCancel, chargement, erreur }: TermFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TermeFormData>({
    resolver: zodResolver(termeSchema),
    defaultValues: {
      termeFr: initial?.termeFr ?? '',
      termeEn: initial?.termeEn ?? '',
      domaine: initial?.domaine ?? '',
      contexte: initial?.contexte ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-anac-muted">Traductions du concept</p>
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-anac-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="termeFr">
              <span className="mr-1 inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded border border-anac-border bg-anac-gray px-1 text-[10px] font-semibold text-anac-navy">
                FR
              </span>
              Français *
            </Label>
            <Input
              id="termeFr"
              {...register('termeFr')}
              placeholder="ex : sécurité aérienne"
              aria-invalid={!!errors.termeFr}
            />
            {errors.termeFr && (
              <p className="text-[11px] text-anac-danger">{errors.termeFr.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="termeEn">
              <span className="mr-1 inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded border border-anac-border bg-anac-gray px-1 text-[10px] font-semibold text-anac-navy">
                EN
              </span>
              English *
            </Label>
            <Input
              id="termeEn"
              {...register('termeEn')}
              placeholder="ex : aviation safety"
              aria-invalid={!!errors.termeEn}
            />
            {errors.termeEn && (
              <p className="text-[11px] text-anac-danger">{errors.termeEn.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="domaine">
          Domaine
          <span className="ml-1 font-normal text-anac-muted">(optionnel)</span>
        </Label>
        <Input
          id="domaine"
          {...register('domaine')}
          placeholder="ex : Réglementation, Navigation aérienne, Météorologie..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contexte">
          Contexte / Note
          <span className="ml-1 font-normal text-anac-muted">(optionnel)</span>
        </Label>
        <textarea
          id="contexte"
          {...register('contexte')}
          rows={3}
          className="input resize-none text-sm"
          placeholder="Précisions d'utilisation, exemples, source..."
        />
      </div>

      {initial?.id && (
        <p className="text-[11px] text-anac-muted">
          Les anciennes valeurs seront conservées dans l&apos;historique.
        </p>
      )}

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-anac-danger">
          {erreur}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={chargement} className="gap-2">
          {chargement ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
