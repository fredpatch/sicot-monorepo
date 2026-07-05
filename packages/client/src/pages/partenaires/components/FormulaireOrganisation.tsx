import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

import { orgSchema, type OrgFormData } from '../partenaires.schemas';
import { TYPES_FORM } from '../partenaires.constants';
import type { Organisation } from '../partenaires.types';

interface FormulaireOrganisationProps {
  initial?: Partial<Organisation>;
  onSubmit: (data: OrgFormData) => void;
  onCancel: () => void;
  chargement: boolean;
}

export function FormulaireOrganisation({
  initial,
  onSubmit,
  onCancel,
  chargement,
}: FormulaireOrganisationProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      nom: initial?.nom ?? '',
      pays: initial?.pays ?? '',
      region: initial?.region ?? '',
      type: initial?.type ?? 'autre',
      notes: initial?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        {/* Nom */}
        <div className="space-y-1.5">
          <Label htmlFor="org-nom">Nom de l&apos;organisation *</Label>
          <Input
            id="org-nom"
            {...register('nom')}
            aria-invalid={!!errors.nom}
            className={errors.nom ? 'border-anac-danger' : ''}
          />
          {errors.nom && <p className="text-[11px] text-anac-danger">{errors.nom.message}</p>}
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="org-type">Type *</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="org-type" aria-invalid={!!errors.type}>
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_FORM.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-[11px] text-anac-danger">{errors.type.message}</p>}
        </div>

        {/* Pays */}
        <div className="space-y-1.5">
          <Label htmlFor="org-pays">Pays *</Label>
          <Input
            id="org-pays"
            {...register('pays')}
            aria-invalid={!!errors.pays}
            className={errors.pays ? 'border-anac-danger' : ''}
          />
          {errors.pays && <p className="text-[11px] text-anac-danger">{errors.pays.message}</p>}
        </div>

        {/* Région */}
        <div className="space-y-1.5">
          <Label htmlFor="org-region">Région</Label>
          <Input id="org-region" {...register('region')} placeholder="Ex: Afrique Centrale" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="org-notes">Notes</Label>
        <textarea
          id="org-notes"
          {...register('notes')}
          rows={3}
          className="input resize-none"
          placeholder="Informations complémentaires..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={chargement} className="gap-2">
          {chargement ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
