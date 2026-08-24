import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { missionsApi } from '@/lib/missions.api';
import { missionCreateSchema, type MissionCreateFormData } from '../../mission.schemas';
import type { Mission } from '../../mission.types';
import { getMissionDuration } from '../../mission.utils';
import { ParticipantsPicker } from '../ParticipantsPicker';
import { ContactSurPlacePicker } from '../ContactSurPlacePicker';
import { MissionPeriod } from '../MissionPeriod';

type StepKey = 'general' | 'destination' | 'participants' | 'logistique' | 'review';

const STEPS: { key: StepKey; label: string; fields: (keyof MissionCreateFormData)[] }[] = [
  { key: 'general', label: 'Informations générales', fields: ['titre'] },
  { key: 'destination', label: 'Dates et destination', fields: ['destination', 'pays', 'dateDebut', 'dateFin'] },
  { key: 'participants', label: 'Participants', fields: [] },
  { key: 'logistique', label: 'Contact et logistique', fields: [] },
  { key: 'review', label: 'Vérification', fields: [] },
];

export default function MissionCreateStepper() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [contactPreview, setContactPreview] = useState<{ prenom: string; nom: string } | undefined>();

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors, isDirty },
  } = useForm<MissionCreateFormData>({
    resolver: zodResolver(missionCreateSchema),
    defaultValues: {
      titre: '',
      destination: '',
      pays: '',
      dateDebut: '',
      dateFin: '',
      participantsIds: [],
    },
  });

  const values = watch();
  const duration = getMissionDuration({ dateDebut: values.dateDebut, dateFin: values.dateFin });

  const createMutation = useMutation({
    mutationFn: (data: MissionCreateFormData) =>
      missionsApi.creer({
        titre: data.titre,
        destination: data.destination,
        pays: data.pays,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        participantsIds: data.participantsIds,
        contactSurPlaceId: data.contactSurPlaceId,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
      const created = res.data as Mission;
      navigate(`/missions/${created.id}`);
    },
  });

  async function goToStep(index: number) {
    if (index <= stepIndex) {
      setStepIndex(index);
      window.setTimeout(() => headingRef.current?.focus(), 0);
      return;
    }
    const fields = STEPS[stepIndex].fields;
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) {
      setStepIndex(index);
      window.setTimeout(() => headingRef.current?.focus(), 0);
    }
  }

  async function nextStep() {
    await goToStep(Math.min(STEPS.length - 1, stepIndex + 1));
  }

  function cancel() {
    if (!isDirty || window.confirm('Quitter sans enregistrer cette mission ?')) {
      navigate('/missions');
    }
  }

  const currentStep = STEPS[stepIndex];

  const periodSummary = useMemo(() => {
    if (!values.destination || !values.pays) return null;
    return `${values.destination}, ${values.pays}`;
  }, [values.destination, values.pays]);

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button type="button" variant="ghost" size="icon-sm" onClick={cancel} aria-label="Retour aux missions">
            <ArrowLeft size={15} aria-hidden="true" />
          </Button>
          <div>
            <p className="text-xs text-anac-muted">Missions / Nouvelle mission</p>
            <h2 className="mt-2 text-2xl font-bold text-anac-navy">Nouvelle mission</h2>
            <p className="mt-1 text-sm text-anac-muted">
              Planifiez une nouvelle mission ou déplacement officiel.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={cancel}>
            Annuler
          </Button>
          {stepIndex === STEPS.length - 1 && (
            <Button
              type="button"
              onClick={handleSubmit((data) => createMutation.mutate(data))}
              disabled={createMutation.isPending}
              className="gap-2 bg-anac-blue"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Créer la mission
            </Button>
          )}
        </div>
      </header>

      {createMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-anac-danger">
          {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Une erreur est survenue.'}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav className="card h-fit p-3" aria-label="Étapes du formulaire">
          <ol className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {STEPS.map((step, index) => (
              <li key={step.key} className="min-w-[190px] lg:min-w-0">
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-anac-sky ${
                    index === stepIndex ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted hover:bg-anac-gray'
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      index < stepIndex
                        ? 'border-anac-blue bg-anac-blue text-white'
                        : index === stepIndex
                          ? 'border-anac-blue bg-white text-anac-blue'
                          : 'border-anac-border bg-white text-anac-muted'
                    }`}
                  >
                    {index < stepIndex ? <Check size={13} aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} noValidate className="card p-0">
          <div className="border-b border-anac-border px-6 py-5">
            <h3 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-anac-navy outline-none">
              {currentStep.label}
            </h3>
          </div>

          <div className="min-h-[420px] px-6 py-5">
            {currentStep.key === 'general' && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <Label htmlFor="titre">Objet de la mission *</Label>
                  <Input
                    id="titre"
                    {...register('titre')}
                    aria-invalid={Boolean(errors.titre)}
                    placeholder="Ex. Participation à l'Assemblée OACI 2026"
                    className="mt-1"
                  />
                  {errors.titre && <p className="mt-1 text-xs text-anac-danger">{errors.titre.message}</p>}
                </div>
              </div>
            )}

            {currentStep.key === 'destination' && (
              <div className="max-w-2xl space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="destination">Destination *</Label>
                    <Input
                      id="destination"
                      {...register('destination')}
                      aria-invalid={Boolean(errors.destination)}
                      className="mt-1"
                    />
                    {errors.destination && (
                      <p className="mt-1 text-xs text-anac-danger">{errors.destination.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="pays">Pays *</Label>
                    <Input id="pays" {...register('pays')} aria-invalid={Boolean(errors.pays)} className="mt-1" />
                    {errors.pays && <p className="mt-1 text-xs text-anac-danger">{errors.pays.message}</p>}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dateDebut">Date de début *</Label>
                    <Input id="dateDebut" type="date" {...register('dateDebut')} className="mt-1" />
                    {errors.dateDebut && (
                      <p className="mt-1 text-xs text-anac-danger">{errors.dateDebut.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="dateFin">Date de fin *</Label>
                    <Input id="dateFin" type="date" {...register('dateFin')} className="mt-1" />
                    {errors.dateFin && <p className="mt-1 text-xs text-anac-danger">{errors.dateFin.message}</p>}
                  </div>
                </div>
                {periodSummary && values.dateDebut && values.dateFin && (
                  <div className="rounded-md border border-anac-border bg-anac-gray px-4 py-3">
                    <p className="text-sm font-semibold text-anac-navy">{periodSummary}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-anac-muted">
                      <MissionPeriod dateDebut={values.dateDebut} dateFin={values.dateFin} />
                      {duration ? ` · Durée : ${duration} jour${duration > 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep.key === 'participants' && (
              <Controller
                name="participantsIds"
                control={control}
                render={({ field }) => (
                  <ParticipantsPicker value={field.value ?? []} onChange={field.onChange} />
                )}
              />
            )}

            {currentStep.key === 'logistique' && (
              <div className="max-w-2xl space-y-5">
                <Controller
                  name="contactSurPlaceId"
                  control={control}
                  render={({ field }) => (
                    <ContactSurPlacePicker
                      onChange={(contact) => {
                        field.onChange(contact?.id);
                        setContactPreview(contact ? { prenom: contact.prenom, nom: contact.nom } : undefined);
                      }}
                    />
                  )}
                />
                <div className="rounded-md border border-anac-border bg-anac-gray px-4 py-3">
                  <p className="text-sm font-semibold text-anac-navy">État logistique</p>
                  <p className="mt-1 text-sm text-anac-muted">À planifier</p>
                </div>
              </div>
            )}

            {currentStep.key === 'review' && (
              <div className="max-w-2xl">
                <dl className="space-y-3 text-sm">
                  <ReviewItem label="Titre" value={values.titre || '-'} />
                  <ReviewItem label="Destination" value={periodSummary ?? '-'} />
                  <ReviewItem
                    label="Dates"
                    value={
                      values.dateDebut && values.dateFin ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MissionPeriod dateDebut={values.dateDebut} dateFin={values.dateFin} />
                          {duration ? ` (${duration} j)` : ''}
                        </span>
                      ) : (
                        '-'
                      )
                    }
                  />
                  <ReviewItem
                    label="Participants"
                    value={`${values.participantsIds?.length ?? 0} sélectionné${
                      (values.participantsIds?.length ?? 0) > 1 ? 's' : ''
                    }`}
                  />
                  <ReviewItem
                    label="Contact sur place"
                    value={contactPreview ? `${contactPreview.prenom} ${contactPreview.nom}` : 'Aucun contact défini'}
                  />
                  <ReviewItem label="Logistique" value="À planifier" />
                </dl>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-anac-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
              className="gap-2"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Précédent
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} className="gap-2 bg-anac-blue">
                Suivant
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending} className="gap-2 bg-anac-blue">
                {createMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Créer la mission
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-anac-border bg-anac-gray px-4 py-3">
      <dt className="text-xs text-anac-muted">{label}</dt>
      <dd className="text-right font-medium text-anac-navy">{value}</dd>
    </div>
  );
}
