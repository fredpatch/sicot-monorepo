import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { missionsApi } from '@/lib/missions.api';
import { missionEditSchema, type MissionEditFormData } from '../../mission.schemas';
import { MISSION_STATUS_OPTIONS } from '../../mission.constants';
import type { Mission } from '../../mission.types';
import { ParticipantsPicker } from '../ParticipantsPicker';
import { ContactSurPlacePicker } from '../ContactSurPlacePicker';
import { MissionLogisticsBadge } from '../MissionLogisticsBadge';

// Grouped sections, not a stepper — a minor operational update shouldn't
// force a user through 5 create-style steps. Report and recommendations
// are deliberately NOT here — they're separate workflows in the mission
// detail workspace (Phase 5), not mixed into general edit.
export default function MissionEditForm() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const missionId = id ? parseInt(id, 10) : undefined;

  const missionQuery = useQuery({
    queryKey: ['mission', missionId],
    queryFn: async () => {
      const res = await missionsApi.getById(missionId!);
      return res.data as Mission;
    },
    enabled: Boolean(missionId),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<MissionEditFormData>({
    resolver: zodResolver(missionEditSchema),
    defaultValues: {
      titre: '',
      destination: '',
      pays: '',
      dateDebut: '',
      dateFin: '',
      statut: 'planifiee',
      participantsIds: [],
    },
  });

  useEffect(() => {
    if (!missionQuery.data) return;
    const mission = missionQuery.data;
    reset({
      titre: mission.titre,
      destination: mission.destination,
      pays: mission.pays,
      dateDebut: mission.dateDebut?.split('T')[0] ?? '',
      dateFin: mission.dateFin?.split('T')[0] ?? '',
      statut: mission.statut,
      participantsIds: mission.participants.map((p) => p.id),
      contactSurPlaceId: mission.contactSurPlace?.id,
    });
  }, [missionQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: MissionEditFormData) => missionsApi.mettreAJour(missionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      navigate(`/missions/${missionId}`);
    },
  });

  async function cancel() {
    if (!isDirty || (await confirm({ title: 'Quitter sans enregistrer les modifications ?' }))) {
      navigate(missionId ? `/missions/${missionId}` : '/missions');
    }
  }

  if (missionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (missionQuery.isError || !missionQuery.data) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Impossible de charger cette mission.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/missions')} className="mt-4">
          Retour aux missions
        </Button>
      </div>
    );
  }

  const mission = missionQuery.data;
  const isCancelled = mission.statut === 'annulee';

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button type="button" variant="ghost" size="icon-sm" onClick={cancel} aria-label="Retour à la mission">
            <ArrowLeft size={15} aria-hidden="true" />
          </Button>
          <div>
            <p className="text-xs text-anac-muted">Missions / {mission.titre} / Modifier</p>
            <h2 className="mt-2 text-2xl font-bold text-anac-navy">Modifier la mission</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={cancel}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit((data) => saveMutation.mutate(data))}
            disabled={saveMutation.isPending || isCancelled}
            className="gap-2 bg-anac-blue"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Enregistrer
          </Button>
        </div>
      </header>

      {isCancelled && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Cette mission est annulée — elle ne peut plus être modifiée.
        </div>
      )}

      {saveMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-anac-danger">
          {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Une erreur est survenue.'}
        </div>
      )}

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} noValidate className="space-y-4">
        <fieldset disabled={isCancelled} className="space-y-4">
          <Section title="Informations">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="titre">Objet de la mission *</Label>
                <Input id="titre" {...register('titre')} aria-invalid={Boolean(errors.titre)} className="mt-1" />
                {errors.titre && <p className="mt-1 text-xs text-anac-danger">{errors.titre.message}</p>}
              </div>
              <div>
                <Label htmlFor="destination">Destination *</Label>
                <Input id="destination" {...register('destination')} className="mt-1" />
                {errors.destination && (
                  <p className="mt-1 text-xs text-anac-danger">{errors.destination.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pays">Pays *</Label>
                <Input id="pays" {...register('pays')} className="mt-1" />
                {errors.pays && <p className="mt-1 text-xs text-anac-danger">{errors.pays.message}</p>}
              </div>
              <div>
                <Label>Statut</Label>
                <Controller
                  name="statut"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MISSION_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </Section>

          <Section title="Dates">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dateDebut">Date de début *</Label>
                <Input id="dateDebut" type="date" {...register('dateDebut')} className="mt-1" />
                {errors.dateDebut && <p className="mt-1 text-xs text-anac-danger">{errors.dateDebut.message}</p>}
              </div>
              <div>
                <Label htmlFor="dateFin">Date de fin *</Label>
                <Input id="dateFin" type="date" {...register('dateFin')} className="mt-1" />
                {errors.dateFin && <p className="mt-1 text-xs text-anac-danger">{errors.dateFin.message}</p>}
              </div>
            </div>
          </Section>

          <Section title="Participants">
            <Controller
              name="participantsIds"
              control={control}
              render={({ field }) => (
                <ParticipantsPicker value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </Section>

          <Section title="Logistique">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-anac-muted">État actuel</p>
                <div className="mt-1">
                  <MissionLogisticsBadge statut={mission.confirmationLogistique} />
                </div>
              </div>
              <p className="max-w-[220px] text-right text-xs text-anac-muted">
                Dérivé de la liste de contrôle — à mettre à jour depuis la fiche mission.
              </p>
            </div>
          </Section>

          <Section title="Contact sur place">
            <Controller
              name="contactSurPlaceId"
              control={control}
              render={({ field }) => (
                <ContactSurPlacePicker
                  initialContact={mission.contactSurPlace}
                  onChange={(contact) => field.onChange(contact?.id ?? null)}
                />
              )}
            />
          </Section>
        </fieldset>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold text-anac-navy">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
