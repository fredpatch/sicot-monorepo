// packages/client/src/pages/utilisateurs/components/ModifierUtilisateurDialog.tsx
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
import { modifierUtilisateurSchema, type ModifierUtilisateurFormData } from '../users.schemas';
import type { Utilisateur } from '../users.types';

interface ModifierUtilisateurDialogProps {
  utilisateur: Utilisateur | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ModifierUtilisateurFormData) => void;
  chargement: boolean;
}

export function ModifierUtilisateurDialog({ utilisateur, onOpenChange, onSubmit, chargement }: ModifierUtilisateurDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ModifierUtilisateurFormData>({
    resolver: zodResolver(modifierUtilisateurSchema),
    defaultValues: {
      email: utilisateur?.email ?? '',
      role: utilisateur?.role ?? 'agent',
    },
  });

  return (
    <Dialog open={!!utilisateur} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Modifier — {utilisateur?.prenom} {utilisateur?.nom}
          </DialogTitle>
          <DialogDescription>Matricule {utilisateur?.matricule} (non modifiable)</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-[11px] text-anac-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Rôle</Label>
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
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
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
      </DialogContent>
    </Dialog>
  );
}