// packages/client/src/pages/profil/components/ChangePasswordForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/auth.api';
import { FormField, EyeToggle, PasswordStrength, ServerError } from '@/pages/login/components';
import { changerMotDePasseSchema, type ChangerMotDePasseFormData } from '../profil.schemas';

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

export function ChangePasswordForm() {
  const [showActuel, setShowActuel] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangerMotDePasseFormData>({
    resolver: zodResolver(changerMotDePasseSchema),
    defaultValues: { motDePasseActuel: '', nouveauMotDePasse: '', confirmation: '' },
  });

  const nouveauMotDePasse = watch('nouveauMotDePasse');

  const mutation = useMutation({
    mutationFn: (data: ChangerMotDePasseFormData) =>
      authApi.changerMotDePasse(data.motDePasseActuel, data.nouveauMotDePasse, data.confirmation),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès.');
      reset();
      setServerError(null);
    },
    onError: (err: unknown) => {
      setServerError(errorMessage(err, 'Erreur lors du changement de mot de passe.'));
    },
  });

  return (
    <div className="card max-w-lg p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-md border border-anac-border bg-anac-gray p-2 text-anac-navy">
          <ShieldCheck size={16} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-anac-navy">Changer le mot de passe</h3>
          <p className="mt-0.5 text-xs text-anac-muted">
            Utilisez un mot de passe fort que vous n&apos;utilisez pas sur d&apos;autres sites.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((data) => {
          setServerError(null);
          mutation.mutate(data);
        })}
        noValidate
        className="space-y-4"
      >
        <FormField id="motDePasseActuel" label="Mot de passe actuel" required error={errors.motDePasseActuel?.message}>
          <div className="relative">
            <Input
              id="motDePasseActuel"
              type={showActuel ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={!!errors.motDePasseActuel}
              {...register('motDePasseActuel')}
            />
            <EyeToggle show={showActuel} onToggle={() => setShowActuel((v) => !v)} />
          </div>
        </FormField>

        <FormField id="nouveauMotDePasse" label="Nouveau mot de passe" required error={errors.nouveauMotDePasse?.message}>
          <div className="relative">
            <Input
              id="nouveauMotDePasse"
              type={showNouveau ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.nouveauMotDePasse}
              {...register('nouveauMotDePasse')}
            />
            <EyeToggle show={showNouveau} onToggle={() => setShowNouveau((v) => !v)} />
          </div>
        </FormField>

        <PasswordStrength password={nouveauMotDePasse ?? ''} />

        <FormField id="confirmation" label="Confirmer le nouveau mot de passe" required error={errors.confirmation?.message}>
          <div className="relative">
            <Input
              id="confirmation"
              type={showConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmation}
              {...register('confirmation')}
            />
            <EyeToggle show={showConfirmation} onToggle={() => setShowConfirmation((v) => !v)} />
          </div>
        </FormField>

        <ServerError message={serverError} />

        <Button type="submit" disabled={mutation.isPending} className="w-full gap-2">
          {mutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Modification...
            </>
          ) : (
            <>
              <ShieldCheck size={14} aria-hidden="true" /> Mettre à jour le mot de passe
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
