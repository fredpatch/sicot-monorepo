import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { organisationsApi } from '@/lib/organisations.api';
import { TYPES_FORM } from '../partenaires.constants';
import type { Organisation } from '../partenaires.types';
import { formatPartnerDate, getOrganisationTypeLabel } from '../partenaires.utils';
import { OrganisationStatusBadge } from './OrganisationStatusBadge';

const partenaireSchema = z
  .object({
    nom: z.string().min(1, 'Le nom est requis'),
    type: z.string().min(1, 'Le type est requis'),
    pays: z.string().min(1, 'Le pays est requis'),
    region: z.string().optional(),
    actif: z.boolean(),
    notes: z.string().optional(),
    ajouterContact: z.boolean(),
    contactPrenom: z.string().optional(),
    contactNom: z.string().optional(),
    contactPoste: z.string().optional(),
    contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
    contactTelephone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.ajouterContact) return;
    if (!data.contactPrenom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contactPrenom'], message: 'Le prénom est requis.' });
    }
    if (!data.contactNom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contactNom'], message: 'Le nom est requis.' });
    }
  });

type PartenaireFormData = z.infer<typeof partenaireSchema>;
type StepKey = 'general' | 'contact' | 'additional' | 'review';

const STEPS: { key: StepKey; label: string; fields: (keyof PartenaireFormData)[] }[] = [
  { key: 'general', label: 'Informations générales', fields: ['nom', 'type', 'pays', 'region', 'actif'] },
  { key: 'contact', label: 'Contact principal', fields: ['ajouterContact', 'contactPrenom', 'contactNom', 'contactEmail', 'contactTelephone', 'contactPoste'] },
  { key: 'additional', label: 'Informations complémentaires', fields: ['notes'] },
  { key: 'review', label: 'Vérification', fields: [] },
];

export default function PartenaireFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const organisationId = id ? parseInt(id, 10) : undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [partialSuccess, setPartialSuccess] = useState<{ organisationId: number; message: string } | null>(null);

  const organisationQuery = useQuery({
    queryKey: ['organisation', organisationId],
    queryFn: async () => {
      const response = await organisationsApi.getById(organisationId!);
      return response.data as Organisation;
    },
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    trigger,
    watch,
    formState: { errors, isDirty },
  } = useForm<PartenaireFormData>({
    resolver: zodResolver(partenaireSchema),
    defaultValues: {
      nom: '',
      type: 'autre',
      pays: '',
      region: '',
      actif: true,
      notes: '',
      ajouterContact: true,
      contactPrenom: '',
      contactNom: '',
      contactPoste: '',
      contactEmail: '',
      contactTelephone: '',
    },
  });

  const values = watch();
  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    if (!organisationQuery.data) return;
    reset({
      nom: organisationQuery.data.nom,
      type: organisationQuery.data.type,
      pays: organisationQuery.data.pays,
      region: organisationQuery.data.region ?? '',
      actif: organisationQuery.data.actif,
      notes: organisationQuery.data.notes ?? '',
      ajouterContact: false,
      contactPrenom: '',
      contactNom: '',
      contactPoste: '',
      contactEmail: '',
      contactTelephone: '',
    });
  }, [organisationQuery.data, reset]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  const saveMutation = useMutation({
    mutationFn: async (data: PartenaireFormData) => {
      if (isEdit && organisationId) {
        const response = await organisationsApi.mettreAJour(organisationId, {
          nom: data.nom,
          type: data.type,
          pays: data.pays,
          region: data.region,
          actif: data.actif,
          notes: data.notes,
        });
        return { organisation: response.data as Organisation, contactCreated: false };
      }

      const response = await organisationsApi.creer({
        nom: data.nom,
        type: data.type,
        pays: data.pays,
        region: data.region,
        actif: data.actif,
        notes: data.notes,
      });
      const organisation = response.data as Organisation;

      if (data.ajouterContact) {
        try {
          await organisationsApi.creerContact(organisation.id, {
            prenom: data.contactPrenom!,
            nom: data.contactNom!,
            poste: data.contactPoste,
            email: data.contactEmail || undefined,
            telephone: data.contactTelephone,
            principal: true,
          });
        } catch {
          setPartialSuccess({
            organisationId: organisation.id,
            message: "Le partenaire a été créé, mais le contact principal n'a pas pu être enregistré.",
          });
          return { organisation, contactCreated: false, contactFailed: true };
        }
      }

      return { organisation, contactCreated: data.ajouterContact, contactFailed: false };
    },
    onSuccess: ({ organisation, contactFailed }) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      queryClient.invalidateQueries({ queryKey: ['organisations-registry'] });
      queryClient.invalidateQueries({ queryKey: ['organisation', organisation.id] });
      if (!contactFailed) navigate(`/partenaires/${organisation.id}`);
    },
  });

  const retryContactMutation = useMutation({
    mutationFn: async () => {
      if (!partialSuccess) throw new Error('Aucun partenaire créé.');
      await organisationsApi.creerContact(partialSuccess.organisationId, {
        prenom: values.contactPrenom!,
        nom: values.contactNom!,
        poste: values.contactPoste,
        email: values.contactEmail || undefined,
        telephone: values.contactTelephone,
        principal: true,
      });
      return partialSuccess.organisationId;
    },
    onSuccess: (createdId) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      queryClient.invalidateQueries({ queryKey: ['organisations-registry'] });
      queryClient.invalidateQueries({ queryKey: ['organisation', createdId] });
      navigate(`/partenaires/${createdId}`);
    },
  });

  const selectedType = useMemo(() => getOrganisationTypeLabel(values.type), [values.type]);

  async function nextStep() {
    const valid = await trigger(currentStep.fields);
    if (!valid) return;
    setStepIndex((index) => Math.min(STEPS.length - 1, index + 1));
  }

  function cancel() {
    navigate(isEdit && organisationId ? `/partenaires/${organisationId}` : '/partenaires');
  }

  if (isEdit && organisationQuery.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-anac-muted">
        <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (isEdit && (organisationQuery.isError || !organisationQuery.data)) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Organisation introuvable.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/partenaires')} className="mt-4">
          Retour aux partenaires
        </Button>
      </div>
    );
  }

  if (isEdit) {
    return (
      <div className="mx-auto max-w-[980px] space-y-5">
        <FormHeader title="Modifier le partenaire" subtitle="Mettez à jour les informations de l'organisation." onCancel={cancel} />
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="card overflow-hidden p-0" noValidate>
          <div className="space-y-5 p-6">
            <GeneralFields control={control} register={register} errors={errors} />
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" rows={6} {...register('notes')} className="input mt-1 resize-none" />
            </div>
            {saveMutation.isError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-anac-danger">
                La modification a échoué.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-anac-border bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={cancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2 bg-anac-blue">
              {saveMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <FormHeader title="Nouveau partenaire" subtitle="Enregistrez une organisation partenaire de coopération." onCancel={cancel} />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="card h-fit p-3" aria-label="Étapes de création">
          {STEPS.map((step, index) => (
            <button
              key={step.key}
              type="button"
              onClick={() => index <= stepIndex && setStepIndex(index)}
              disabled={index > stepIndex}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                index === stepIndex ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted hover:bg-anac-gray'
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-current text-xs">
                {index < stepIndex ? <Check size={13} aria-hidden="true" /> : index + 1}
              </span>
              {step.label}
            </button>
          ))}
        </aside>

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="card overflow-hidden p-0" noValidate>
          <div className="min-h-[430px] p-6">
            <h3 ref={headingRef} tabIndex={-1} className="font-bold text-anac-navy outline-none">
              {currentStep.label}
            </h3>

            <div className="mt-5">
              {currentStep.key === 'general' && (
                <div className="max-w-3xl space-y-5">
                  <GeneralFields control={control} register={register} errors={errors} />
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-anac-muted">
                    Les types affichés correspondent aux valeurs métier actuellement supportées par SICOT.
                  </div>
                </div>
              )}

              {currentStep.key === 'contact' && (
                <ContactStep control={control} register={register} errors={errors} ajouterContact={values.ajouterContact} />
              )}

              {currentStep.key === 'additional' && (
                <div className="max-w-3xl space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      rows={7}
                      {...register('notes')}
                      className="input mt-1 resize-none"
                      placeholder="Informations utiles sur la relation, le périmètre ou le contexte de coopération..."
                    />
                  </div>
                </div>
              )}

              {currentStep.key === 'review' && (
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-md border border-anac-border p-4">
                    <h4 className="font-semibold text-anac-navy">{values.nom || 'Organisation sans nom'}</h4>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <ReviewItem label="Type" value={selectedType} />
                      <ReviewItem label="Pays" value={values.pays || '-'} />
                      <ReviewItem label="Région" value={values.region || '-'} />
                      <ReviewItem label="Statut" value={values.actif ? 'Actif' : 'Inactif'} />
                      <ReviewItem
                        label="Contact principal"
                        value={values.ajouterContact ? `${values.contactPrenom} ${values.contactNom}` : 'Aucun contact'}
                      />
                      <ReviewItem label="Notes" value={values.notes ? 'Notes renseignées' : 'Aucune note'} />
                    </dl>
                  </div>
                  <div className="rounded-md border border-anac-border bg-anac-gray p-4 text-sm">
                    <p className="font-semibold text-anac-navy">Création</p>
                    <p className="mt-2 text-anac-muted">
                      L&apos;organisation sera créée avant le contact principal. Si le contact échoue, SICOT affichera
                      une option de reprise sans créer un doublon.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {partialSuccess && (
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-semibold text-anac-navy">{partialSuccess.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => retryContactMutation.mutate()}
                    disabled={retryContactMutation.isPending}
                    className="gap-2"
                  >
                    {retryContactMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Réessayer le contact
                  </Button>
                  <Button type="button" onClick={() => navigate(`/partenaires/${partialSuccess.organisationId}`)} className="bg-anac-blue">
                    Ouvrir la fiche
                  </Button>
                </div>
              </div>
            )}

            {saveMutation.isError && (
              <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-anac-danger">
                La création du partenaire a échoué.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-anac-border bg-slate-50 px-6 py-4">
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
              <Button type="submit" disabled={saveMutation.isPending || Boolean(partialSuccess)} className="gap-2 bg-anac-blue">
                {saveMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                Créer le partenaire
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function FormHeader({ title, subtitle, onCancel }: { title: string; subtitle: string; onCancel: () => void }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <Link to="/partenaires" className="inline-flex items-center gap-1 text-xs text-anac-blue hover:text-anac-navy">
          <ArrowLeft size={13} aria-hidden="true" />
          Partenaires
        </Link>
        <h2 className="mt-4 text-2xl font-bold leading-tight text-anac-navy">{title}</h2>
        <p className="mt-1 text-sm text-anac-muted">{subtitle}</p>
      </div>
      <Button type="button" variant="outline" onClick={onCancel}>
        Annuler
      </Button>
    </header>
  );
}

function GeneralFields({
  control,
  register,
  errors,
}: {
  control: ReturnType<typeof useForm<PartenaireFormData>>['control'];
  register: ReturnType<typeof useForm<PartenaireFormData>>['register'];
  errors: ReturnType<typeof useForm<PartenaireFormData>>['formState']['errors'];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="nom">Nom de l&apos;organisation *</Label>
        <Input id="nom" {...register('nom')} aria-invalid={!!errors.nom} className={errors.nom ? 'border-anac-danger' : ''} />
        {errors.nom && <p className="text-xs text-anac-danger">{errors.nom.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Type d&apos;organisation *</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="type" aria-invalid={!!errors.type}>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES_FORM.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-anac-danger">{errors.type.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pays">Pays *</Label>
        <Input id="pays" {...register('pays')} aria-invalid={!!errors.pays} className={errors.pays ? 'border-anac-danger' : ''} />
        {errors.pays && <p className="text-xs text-anac-danger">{errors.pays.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="region">Région</Label>
        <Input id="region" {...register('region')} placeholder="Ex: Afrique centrale" />
      </div>
      <Controller
        name="actif"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <button
              type="button"
              onClick={() => field.onChange(!field.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-anac-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
            >
              <span>{field.value ? 'Organisation active' : 'Organisation inactive'}</span>
              <OrganisationStatusBadge actif={field.value} />
            </button>
          </div>
        )}
      />
    </div>
  );
}

function ContactStep({
  control,
  register,
  errors,
  ajouterContact,
}: {
  control: ReturnType<typeof useForm<PartenaireFormData>>['control'];
  register: ReturnType<typeof useForm<PartenaireFormData>>['register'];
  errors: ReturnType<typeof useForm<PartenaireFormData>>['formState']['errors'];
  ajouterContact: boolean;
}) {
  return (
    <div className="max-w-3xl space-y-5">
      <Controller
        name="ajouterContact"
        control={control}
        render={({ field }) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => field.onChange(true)}
              className={`rounded-md border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                field.value ? 'border-anac-blue bg-blue-50' : 'border-anac-border bg-white'
              }`}
            >
              <span className="font-semibold text-anac-navy">Ajouter un contact principal maintenant</span>
            </button>
            <button
              type="button"
              onClick={() => field.onChange(false)}
              className={`rounded-md border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                !field.value ? 'border-anac-blue bg-blue-50' : 'border-anac-border bg-white'
              }`}
            >
              <span className="font-semibold text-anac-navy">Continuer sans contact</span>
            </button>
          </div>
        )}
      />

      {!ajouterContact ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-anac-warning">
          Cette organisation sera enregistrée sans contact principal.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactPrenom">Prénom *</Label>
            <Input id="contactPrenom" {...register('contactPrenom')} aria-invalid={!!errors.contactPrenom} />
            {errors.contactPrenom && <p className="text-xs text-anac-danger">{errors.contactPrenom.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactNom">Nom *</Label>
            <Input id="contactNom" {...register('contactNom')} aria-invalid={!!errors.contactNom} />
            {errors.contactNom && <p className="text-xs text-anac-danger">{errors.contactNom.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPoste">Poste</Label>
            <Input id="contactPoste" {...register('contactPoste')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" {...register('contactEmail')} aria-invalid={!!errors.contactEmail} />
            {errors.contactEmail && <p className="text-xs text-anac-danger">{errors.contactEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactTelephone">Téléphone</Label>
            <Input id="contactTelephone" type="tel" {...register('contactTelephone')} />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-anac-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-anac-navy">{value}</dd>
    </div>
  );
}

export function OrganisationSystemDate({ organisation }: { organisation: Organisation }) {
  return <span>{formatPartnerDate(organisation.createdAt, 'long')}</span>;
}
