// packages/client/src/pages/glossaire/components/FormulaireTerme.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { termeSchema, type TermeFormData } from '../glossary.schemas';
import type { Terme } from '../glossary.types';

interface FormulaireTermeProps {
  initial?: Partial<Terme>;
  onSubmit: (data: TermeFormData) => void;
  onCancel: () => void;
  chargement: boolean;
}

export function FormulaireTerme({ initial, onSubmit, onCancel, chargement }: FormulaireTermeProps) {
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="termeFr">Terme français *</Label>
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
          <Label htmlFor="termeEn">Terme anglais *</Label>
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

      <div className="space-y-1.5">
        <Label htmlFor="domaine">
          Domaine
          <span className="text-anac-muted font-normal ml-1">(optionnel)</span>
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
          <span className="text-anac-muted font-normal ml-1">(optionnel)</span>
        </Label>
        <textarea
          id="contexte"
          {...register('contexte')}
          rows={3}
          className="input resize-none text-sm"
          placeholder="Précisions d'utilisation, exemples, source..."
        />
      </div>

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
