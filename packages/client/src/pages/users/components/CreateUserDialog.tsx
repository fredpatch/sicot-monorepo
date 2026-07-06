// packages/client/src/pages/utilisateurs/components/CreerUtilisateurDialog.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ROLES } from '../users.constants';
import { creerUtilisateurSchema, type CreerUtilisateurFormData } from '../users.schemas';
import type { PrefillUtilisateur } from '../users.types';

interface CreerUtilisateurDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreerUtilisateurFormData) => void;
  chargement: boolean;
  prefill?: PrefillUtilisateur;
}

export function CreerUtilisateurDialog({ open, onOpenChange, onSubmit, chargement, prefill }: CreerUtilisateurDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreerUtilisateurFormData>({
    resolver: zodResolver(creerUtilisateurSchema),
    defaultValues: {
      matricule: prefill?.matricule ?? '',
      nom: prefill?.nom ?? '',
      prenom: prefill?.prenom ?? '',
      email: '',
      role: 'agent',
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            {prefill
              ? 'Matricule, nom et prénom pré-remplis depuis l\'annuaire Personnel ANAC.'
              : 'Un OTP sera envoyé par email pour la première connexion.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="matricule">Matricule *</Label>
                <Input
                  id="matricule"
                  {...register('matricule')}
                  disabled={!!prefill}
                  aria-invalid={!!errors.matricule}
                />
                {errors.matricule && <p className="text-[11px] text-anac-danger">{errors.matricule.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Rôle *</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom *</Label>
                <Input id="nom" {...register('nom')} aria-invalid={!!errors.nom} />
                {errors.nom && <p className="text-[11px] text-anac-danger">{errors.nom.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input id="prenom" {...register('prenom')} aria-invalid={!!errors.prenom} />
                {errors.prenom && <p className="text-[11px] text-anac-danger">{errors.prenom.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-[11px] text-anac-danger">{errors.email.message}</p>}
              <p className="text-[11px] text-anac-muted">
                Non fourni par l&apos;annuaire Personnel ANAC — à saisir manuellement.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={chargement} className="gap-2">
              {chargement ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Création...
                </>
              ) : (
                'Créer et envoyer l\'OTP'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}