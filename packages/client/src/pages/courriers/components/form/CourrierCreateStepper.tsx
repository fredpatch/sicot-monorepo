import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  X,
} from 'lucide-react';

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
import { courriersApi } from '@/lib/courriers.api';
import { organisationsApi } from '@/lib/organisations.api';
import { contactsApi, type ContactListItem } from '@/lib/contacts.api';
import { courrierCreateSchema, type CourrierCreateFormData } from '../../courrier.schemas';
import type { Courrier } from '../../courrier.types';
import { CourrierDocumentPicker, type DocumentLie } from '../CourrierDocumentPicker';
import { QuickCreateOrganisationDialog } from '../QuickCreateOrganisationDialog';
import { QuickCreateContactDialog } from '../QuickCreateContactDialog';

interface Organisation {
  id: number;
  nom: string;
  pays: string;
}

type StepKey = 'general' | 'interlocuteur' | 'documents' | 'review';

const STEPS: { key: StepKey; label: string; fields: (keyof CourrierCreateFormData)[] }[] = [
  {
    key: 'general',
    label: 'Informations générales',
    fields: ['direction', 'objet', 'dateReception', 'reponseRequise'],
  },
  { key: 'interlocuteur', label: 'Expéditeur / Destinataire', fields: [] },
  { key: 'documents', label: 'Documents', fields: [] },
  { key: 'review', label: 'Vérification', fields: [] },
];

export default function CourrierCreateStepper() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const reponseAIdParam = searchParams.get('reponseAId');
  const reponseAId = reponseAIdParam ? parseInt(reponseAIdParam) : undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const [documentsLies, setDocumentsLies] = useState<DocumentLie[]>([]);
  const [interlocuteurPreview, setInterlocuteurPreview] = useState<Organisation | null>(null);
  const [contactPreview, setContactPreview] = useState<ContactListItem | null>(null);
  const [quickCreateOrgOpen, setQuickCreateOrgOpen] = useState(false);
  const [quickCreateContactOpen, setQuickCreateContactOpen] = useState(false);

  const { data: courrierParent } = useQuery({
    queryKey: ['courrier', reponseAId],
    queryFn: async () => {
      const res = await courriersApi.getById(reponseAId!);
      return res.data as Courrier;
    },
    enabled: Boolean(reponseAId),
  });

  const { data: orgsData } = useQuery({
    queryKey: ['organisations-liste'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: Organisation[] };
    },
  });
  const organisations = orgsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CourrierCreateFormData>({
    resolver: zodResolver(courrierCreateSchema),
    defaultValues: {
      direction: reponseAId ? 'sortant' : 'entrant',
      objet: '',
      dateReception: new Date().toISOString().split('T')[0],
      reponseRequise: 'oui',
      reponseAId,
    },
  });

  // Pré-remplir l'objet une fois le courrier parent chargé (mode réponse)
  const objetPreRempli = useRef(false);
  if (courrierParent && !objetPreRempli.current) {
    setValue('objet', `RE: ${courrierParent.objet}`);
    objetPreRempli.current = true;
  }

  const values = watch();
  const isReponse = Boolean(reponseAId);
  const organisationSelectionneeId =
    values.direction === 'entrant'
      ? values.expediteurOrganisationId
      : values.destinataireOrganisationId;

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-organisation', organisationSelectionneeId],
    queryFn: async () => {
      const res = await contactsApi.lister({
        organisationId: organisationSelectionneeId,
        actif: true,
      });
      return res.data as { data: ContactListItem[] };
    },
    enabled: Boolean(organisationSelectionneeId),
  });
  const contactsDisponibles = contactsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CourrierCreateFormData) =>
      courriersApi.creer({
        direction: data.direction,
        objet: data.objet,
        dateReception: data.dateReception,
        reponseRequise: data.reponseRequise,
        expediteurOrganisationId: data.expediteurOrganisationId,
        destinataireOrganisationId: data.destinataireOrganisationId,
        expediteurContactId: data.expediteurContactId,
        destinataireContactId: data.destinataireContactId,
        dateLimiteReponse: data.dateLimiteReponse || undefined,
        reponseAId: data.reponseAId,
        accordId: data.accordId,
        documentIds: documentsLies.map((d) => d.id),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['courriers'] });
      queryClient.invalidateQueries({ queryKey: ['courriers-aggregates'] });
      const created = res.data as Courrier;
      navigate(`/courriers/${created.id}`);
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

  async function cancel() {
    if (!isDirty || (await confirm({ title: 'Quitter sans enregistrer ce courrier ?' }))) {
      navigate('/courriers');
    }
  }

  const currentStep = STEPS[stepIndex];
  const interlocuteurLabel = values.direction === 'entrant' ? 'Expéditeur' : 'Destinataire';
  const orgFieldName =
    values.direction === 'entrant' ? 'expediteurOrganisationId' : 'destinataireOrganisationId';
  const contactFieldName =
    values.direction === 'entrant' ? 'expediteurContactId' : 'destinataireContactId';

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={cancel}
            aria-label="Retour aux courriers"
          >
            <ArrowLeft size={15} aria-hidden="true" />
          </Button>
          <div>
            <p className="text-xs text-anac-muted">
              Courriers / {isReponse ? 'Répondre' : 'Nouveau courrier'}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-anac-navy">
              {isReponse ? 'Répondre au courrier' : 'Nouveau courrier'}
            </h2>
            {courrierParent && (
              <p className="mt-1 text-sm text-anac-muted">
                En réponse à <span className="font-mono">{courrierParent.reference}</span> -{' '}
                {courrierParent.objet}
              </p>
            )}
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
              {createMutation.isPending && (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              )}
              {isReponse ? 'Envoyer la réponse' : 'Créer le courrier'}
            </Button>
          )}
        </div>
      </header>

      {createMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-anac-danger">
          {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Une erreur est survenue.'}
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
                    index === stepIndex
                      ? 'bg-blue-50 text-anac-blue'
                      : 'text-anac-muted hover:bg-anac-gray'
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
                  <span className="text-sm font-medium">
                    {step.key === 'interlocuteur' ? interlocuteurLabel : step.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          noValidate
          className="card p-0"
        >
          <div className="border-b border-anac-border px-6 py-5">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-bold text-anac-navy outline-none"
            >
              {currentStep.key === 'interlocuteur' ? interlocuteurLabel : currentStep.label}
            </h3>
          </div>

          <div className="min-h-[420px] px-6 py-5">
            {currentStep.key === 'general' && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <Label>Direction *</Label>
                  <Controller
                    name="direction"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isReponse}
                      >
                        <SelectTrigger className="mt-1" aria-invalid={Boolean(errors.direction)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrant">Entrant</SelectItem>
                          <SelectItem value="sortant">Sortant</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="objet">Objet *</Label>
                  <Input
                    id="objet"
                    {...register('objet')}
                    placeholder="Objet du courrier..."
                    aria-invalid={Boolean(errors.objet)}
                    className="mt-1"
                  />
                  {errors.objet && (
                    <p className="mt-1 text-xs text-anac-danger">{errors.objet.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dateReception">
                      {values.direction === 'entrant' ? 'Date de réception *' : "Date d'envoi *"}
                    </Label>
                    <Input
                      id="dateReception"
                      type="date"
                      {...register('dateReception')}
                      aria-invalid={Boolean(errors.dateReception)}
                      className="mt-1"
                    />
                    {errors.dateReception && (
                      <p className="mt-1 text-xs text-anac-danger">
                        {errors.dateReception.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Réponse requise *</Label>
                    <Controller
                      name="reponseRequise"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="pour_information">Pour information</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {values.reponseRequise === 'oui' && (
                  <div>
                    <Label htmlFor="dateLimiteReponse">Date limite de réponse</Label>
                    <Input
                      id="dateLimiteReponse"
                      type="date"
                      {...register('dateLimiteReponse')}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep.key === 'interlocuteur' && (
              <div className="max-w-2xl space-y-5">
                <Controller
                  name={orgFieldName}
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label>{interlocuteurLabel}</Label>
                      <Select
                        value={field.value?.toString() ?? '__none__'}
                        onValueChange={(v) => {
                          const id = v === '__none__' ? undefined : parseInt(v);
                          field.onChange(id);
                          setInterlocuteurPreview(organisations.find((o) => o.id === id) ?? null);
                          setValue(contactFieldName, undefined);
                          setContactPreview(null);
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">- Aucun -</SelectItem>
                          {organisations.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.nom}
                              <span className="ml-1 text-xs text-anac-muted">· {org.pays}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setQuickCreateOrgOpen(true)}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
                      >
                        <Plus size={12} aria-hidden="true" />
                        {interlocuteurLabel} introuvable ? Créer une nouvelle organisation
                      </button>
                    </div>
                  )}
                />

                {organisationSelectionneeId && (
                  <Controller
                    name={contactFieldName}
                    control={control}
                    render={({ field }) => (
                      <div>
                        <Label>
                          Contact <span className="font-normal text-anac-muted">(optionnel)</span>
                        </Label>
                        <Select
                          value={field.value?.toString() ?? '__none__'}
                          onValueChange={(v) => {
                            const id = v === '__none__' ? undefined : parseInt(v);
                            field.onChange(id);
                            setContactPreview(contactsDisponibles.find((c) => c.id === id) ?? null);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="- Aucun contact spécifique -" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">- Aucun contact spécifique -</SelectItem>
                            {contactsDisponibles.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id.toString()}>
                                {contact.prenom} {contact.nom}
                                {contact.poste ? (
                                  <span className="ml-1 text-xs text-anac-muted">
                                    · {contact.poste}
                                  </span>
                                ) : null}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {contactsDisponibles.length === 0 && (
                          <p className="mt-1.5 text-xs text-anac-muted">
                            Aucun contact actif enregistré pour cette organisation.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => setQuickCreateContactOpen(true)}
                          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
                        >
                          <Plus size={12} aria-hidden="true" />
                          Contact introuvable ? En créer un nouveau
                        </button>
                      </div>
                    )}
                  />
                )}
              </div>
            )}

            {currentStep.key === 'documents' && (
              <div className="max-w-2xl space-y-4">
                <Label>
                  Documents joints <span className="font-normal text-anac-muted">(optionnel)</span>
                </Label>

                {documentsLies.length > 0 && (
                  <ul className="space-y-2">
                    {documentsLies.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2.5"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-anac-navy">
                          <FileText size={14} className="text-green-600" aria-hidden="true" />
                          {doc.nom}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDocumentsLies((docs) => docs.filter((d) => d.id !== doc.id))
                          }
                          className="text-anac-muted transition-colors hover:text-anac-danger"
                          aria-label={`Retirer ${doc.nom}`}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <CourrierDocumentPicker
                  onPicked={(doc) => setDocumentsLies((docs) => [...docs, doc])}
                  excludeIds={documentsLies.map((d) => d.id)}
                />
              </div>
            )}

            {currentStep.key === 'review' && (
              <div className="max-w-2xl">
                <dl className="space-y-3 text-sm">
                  <ReviewItem
                    label="Direction"
                    value={values.direction === 'entrant' ? 'Entrant' : 'Sortant'}
                  />
                  <ReviewItem label="Objet" value={values.objet || '-'} />
                  <ReviewItem label="Date" value={values.dateReception || '-'} />
                  <ReviewItem
                    label={interlocuteurLabel}
                    value={
                      interlocuteurPreview
                        ? `${interlocuteurPreview.nom} (${interlocuteurPreview.pays})`
                        : 'Aucun'
                    }
                  />
                  <ReviewItem
                    label="Contact"
                    value={
                      contactPreview ? `${contactPreview.prenom} ${contactPreview.nom}` : 'Aucun'
                    }
                  />
                  <ReviewItem
                    label="Réponse requise"
                    value={
                      values.reponseRequise === 'oui'
                        ? `Oui${values.dateLimiteReponse ? ` - délai ${values.dateLimiteReponse}` : ''}`
                        : values.reponseRequise === 'non'
                          ? 'Non'
                          : 'Pour information'
                    }
                  />
                  <ReviewItem
                    label="Documents"
                    value={
                      documentsLies.length > 0
                        ? `${documentsLies.length} document${documentsLies.length > 1 ? 's' : ''}`
                        : 'Aucun'
                    }
                  />
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
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-2 bg-anac-blue"
              >
                {createMutation.isPending && (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                )}
                {isReponse ? 'Envoyer la réponse' : 'Créer le courrier'}
              </Button>
            )}
          </div>
        </form>
      </div>

      <QuickCreateOrganisationDialog
        open={quickCreateOrgOpen}
        onOpenChange={setQuickCreateOrgOpen}
        onCreated={(org) => {
          setValue(orgFieldName, org.id);
          setInterlocuteurPreview(org);
        }}
      />

      {interlocuteurPreview && (
        <QuickCreateContactDialog
          open={quickCreateContactOpen}
          onOpenChange={setQuickCreateContactOpen}
          organisation={interlocuteurPreview}
          onCreated={(contact) => {
            setValue(contactFieldName, contact.id);
            setContactPreview(contact);
          }}
        />
      )}
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
