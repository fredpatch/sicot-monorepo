import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';

import { contactSchema, type ContactFormData } from '../partenaires.schemas';

interface FormulaireContactProps {
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  chargement: boolean;
}

export function FormulaireContact({ onSubmit, onCancel, chargement }: FormulaireContactProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      poste: '',
      principal: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-nom">Nom *</Label>
          <Input
            id="c-nom"
            {...register('nom')}
            aria-invalid={!!errors.nom}
            className={errors.nom ? 'border-anac-danger' : ''}
          />
          {errors.nom && <p className="text-[11px] text-anac-danger">{errors.nom.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-prenom">Prénom *</Label>
          <Input
            id="c-prenom"
            {...register('prenom')}
            aria-invalid={!!errors.prenom}
            className={errors.prenom ? 'border-anac-danger' : ''}
          />
          {errors.prenom && <p className="text-[11px] text-anac-danger">{errors.prenom.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            inputMode="email"
            {...register('email')}
            aria-invalid={!!errors.email}
            className={errors.email ? 'border-anac-danger' : ''}
          />
          {errors.email && <p className="text-[11px] text-anac-danger">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-tel">Téléphone</Label>
          <Input id="c-tel" type="tel" {...register('telephone')} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="c-poste">Poste / Fonction</Label>
          <Input
            id="c-poste"
            {...register('poste')}
            placeholder="Ex: Directeur de la Sécurité Aérienne"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="c-principal"
          {...register('principal')}
          className="rounded border-anac-border"
        />
        <label htmlFor="c-principal" className="text-sm text-anac-text cursor-pointer">
          Contact principal de l&apos;organisation
        </label>
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
            'Ajouter le contact'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
