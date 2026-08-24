import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ClipboardCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersApi } from '@/lib/users.api';
import { recommandationSchema, type RecommandationFormData } from '../mission.schemas';

interface UserOption {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
}

export function RecommendationDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RecommandationFormData) => void;
  submitting: boolean;
}) {
  const usersQuery = useQuery({
    queryKey: ['users-liste'],
    queryFn: async () => {
      const res = await usersApi.lister({ pageSize: 200 });
      return res.data as { data: UserOption[] };
    },
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecommandationFormData>({
    resolver: zodResolver(recommandationSchema),
    defaultValues: { texte: '', dateLimite: '' },
  });

  function submit(data: RecommandationFormData) {
    onSubmit(data);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-anac-blue">
              <ClipboardCheck size={18} aria-hidden="true" />
            </span>
            <span>
              <DialogTitle className="text-base">Ajouter une recommandation</DialogTitle>
              <DialogDescription>Une date limite permet d&apos;activer le suivi et les alertes.</DialogDescription>
            </span>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="rec-texte">Recommandation *</Label>
              <textarea
                id="rec-texte"
                {...register('texte')}
                rows={4}
                className="input mt-1 resize-none"
                aria-invalid={Boolean(errors.texte)}
              />
              {errors.texte && <p className="mt-1 text-xs text-anac-danger">{errors.texte.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Responsable</Label>
                <Controller
                  name="responsableId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : '__none__'}
                      onValueChange={(value) => field.onChange(value === '__none__' ? undefined : Number(value))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Non assigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Non assigné</SelectItem>
                        {(usersQuery.data?.data ?? []).map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.prenom} {user.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="rec-date">Date limite</Label>
                <input id="rec-date" type="date" {...register('dateLimite')} className="input mt-1" />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2 bg-anac-blue">
              {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
