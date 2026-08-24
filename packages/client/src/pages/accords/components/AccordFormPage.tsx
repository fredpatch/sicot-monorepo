import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  Upload,
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
import { accordsApi } from '@/lib/accords.api';
import { documentsApi } from '@/lib/documents.api';
import { organisationsApi } from '@/lib/organisations.api';
import { ACCORD_STATUS_OPTIONS } from '../accord.constants';
import type { Accord, OrganisationOption } from '../accord.types';
import { formatAccordDate } from '../accord.utils';

const accordSchema = z
  .object({
    titre: z.string().min(1, 'Le titre est requis'),
    dateSignature: z.string().min(1, 'La date de signature est requise'),
    avecExpiration: z.boolean(),
    dateExpiration: z.string().optional(),
    statut: z.enum(['actif', 'expire', 'suspendu', 'en_renouvellement']).optional(),
    partenairesIds: z.array(z.number()).min(1, 'Au moins un partenaire est requis'),
    documentId: z.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.avecExpiration && !data.dateExpiration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateExpiration'],
        message: "La date d'expiration est requise pour un accord avec échéance.",
      });
    }
    if (data.avecExpiration && data.dateSignature && data.dateExpiration) {
      const signature = new Date(data.dateSignature);
      const expiration = new Date(data.dateExpiration);
      if (expiration <= signature) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dateExpiration'],
          message: "La date d'expiration doit être postérieure à la signature.",
        });
      }
    }
  });

type AccordFormData = z.infer<typeof accordSchema>;
type StepKey = 'general' | 'partners' | 'validity' | 'document' | 'review';

const STEPS: { key: StepKey; label: string; fields: (keyof AccordFormData)[] }[] = [
  { key: 'general', label: 'Informations générales', fields: ['titre'] },
  { key: 'partners', label: 'Partenaires', fields: ['partenairesIds'] },
  { key: 'validity', label: 'Validité', fields: ['dateSignature', 'dateExpiration', 'avecExpiration'] },
  { key: 'document', label: 'Document', fields: ['documentId'] },
  { key: 'review', label: 'Notes et vérification', fields: ['notes'] },
];

export default function AccordFormPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const accordId = id ? parseInt(id, 10) : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [documentMode, setDocumentMode] = useState<'upload' | 'existing'>('upload');
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [documentLie, setDocumentLie] = useState<{ id: number; nom: string } | null>(null);

  const accordQuery = useQuery({
    queryKey: ['accord', accordId],
    queryFn: async () => {
      const res = await accordsApi.getById(accordId!);
      return res.data as Accord;
    },
    enabled: isEdit,
  });

  const orgsQuery = useQuery({
    queryKey: ['organisations-liste'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: OrganisationOption[]; total: number };
    },
  });

  const docsQuery = useQuery({
    queryKey: ['documents-accords'],
    queryFn: async () => {
      const res = await documentsApi.lister({ categorie: 'accord', pageSize: 100 });
      return res.data as { data: { id: number; nomOriginal: string; createdAt: string }[]; total: number };
    },
    enabled: documentMode === 'existing',
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isDirty },
  } = useForm<AccordFormData>({
    resolver: zodResolver(accordSchema),
    defaultValues: {
      titre: '',
      dateSignature: '',
      avecExpiration: true,
      dateExpiration: '',
      partenairesIds: [],
      notes: '',
    },
  });

  const values = watch();

  useEffect(() => {
    if (!accordQuery.data) return;
    reset({
      titre: accordQuery.data.titre,
      dateSignature: accordQuery.data.dateSignature?.split('T')[0] ?? '',
      avecExpiration: Boolean(accordQuery.data.dateExpiration),
      dateExpiration: accordQuery.data.dateExpiration?.split('T')[0] ?? '',
      statut: accordQuery.data.statut,
      partenairesIds: accordQuery.data.partenaires.map((partner) => partner.id),
      documentId: accordQuery.data.documentId,
      notes: accordQuery.data.notes ?? '',
    });
    if (accordQuery.data.documentId) {
      documentsApi.getById(accordQuery.data.documentId).then((res) => {
        setDocumentLie({ id: res.data.id, nom: res.data.nomOriginal });
      });
    }
  }, [accordQuery.data, reset]);

  useEffect(() => {
    if (!values.avecExpiration && values.dateExpiration) {
      setValue('dateExpiration', '', { shouldDirty: true, shouldValidate: true });
    }
  }, [setValue, values.avecExpiration, values.dateExpiration]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const selectedPartners = useMemo(
    () =>
      (orgsQuery.data?.data ?? []).filter((org) => values.partenairesIds?.includes(org.id)),
    [orgsQuery.data?.data, values.partenairesIds]
  );

  const filteredPartners = useMemo(() => {
    const query = partnerSearch.trim().toLowerCase();
    const organisations = orgsQuery.data?.data ?? [];
    if (!query) return organisations;
    return organisations.filter((org) =>
      `${org.nom} ${org.pays} ${org.type}`.toLowerCase().includes(query)
    );
  }, [orgsQuery.data?.data, partnerSearch]);

  const saveMutation = useMutation({
    mutationFn: (data: AccordFormData) => {
      const payload = {
        titre: data.titre,
        dateSignature: data.dateSignature,
        dateExpiration: data.avecExpiration ? data.dateExpiration || undefined : undefined,
        partenairesIds: data.partenairesIds,
        documentId: data.documentId,
        notes: data.notes || undefined,
      };
      if (isEdit) {
        return accordsApi.mettreAJour(accordId!, { ...payload, statut: data.statut });
      }
      return accordsApi.creer(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accords'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      const saved = isEdit ? accordId : (res.data as Accord).id;
      navigate(saved ? `/accords/${saved}` : '/accords');
    },
  });

  async function goToStep(index: number) {
    if (index <= stepIndex) {
      setStepIndex(index);
      window.setTimeout(() => headingRef.current?.focus(), 0);
      return;
    }
    const fields = STEPS[stepIndex].fields;
    const valid = await trigger(fields);
    if (valid) {
      setStepIndex(index);
      window.setTimeout(() => headingRef.current?.focus(), 0);
    }
  }

  async function nextStep() {
    await goToStep(Math.min(STEPS.length - 1, stepIndex + 1));
  }

  async function cancel() {
    if (!isDirty || (await confirm({ title: 'Quitter sans enregistrer les modifications ?' }))) {
      navigate('/accords');
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadEnCours(true);
    setUploadErreur(null);
    try {
      const res = await documentsApi.upload(file, 'accord');
      const { document, doublon } = res.data;
      setDocumentLie({ id: document.id, nom: document.nomOriginal });
      setValue('documentId', document.id, { shouldDirty: true, shouldValidate: true });
      if (doublon) {
        setUploadErreur('Un fichier identique existe déjà. Le document a quand même été lié.');
      }
    } catch {
      setUploadErreur("Erreur lors de l'upload. Vérifiez le fichier et réessayez.");
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (isEdit && accordQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (isEdit && accordQuery.isError) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Impossible de charger cet accord.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/accords')} className="mt-4">
          Retour aux accords
        </Button>
      </div>
    );
  }

  const currentStep = STEPS[stepIndex];
  const validityPreview = buildValidityPreview(values.dateSignature, values.dateExpiration, values.avecExpiration);

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button type="button" variant="ghost" size="icon-sm" onClick={cancel} aria-label="Retour aux accords">
            <ArrowLeft size={15} aria-hidden="true" />
          </Button>
          <div>
            <p className="text-xs text-anac-muted">
              Accords / {isEdit ? accordQuery.data?.reference : 'Nouvel accord'}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-anac-navy">
              {isEdit ? "Modifier l'accord" : 'Nouvel accord'}
            </h2>
            <p className="mt-1 text-sm text-anac-muted">
              {isEdit
                ? 'Mettez à jour les informations de coopération.'
                : 'Créez un nouvel accord ou convention de coopération.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={cancel}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit((data) => saveMutation.mutate(data))} disabled={saveMutation.isPending} className="bg-anac-blue">
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {isEdit ? 'Enregistrer' : "Créer l'accord"}
          </Button>
        </div>
      </header>

      {saveMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-anac-danger">
          {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} noValidate className="card p-0">
          <div className="border-b border-anac-border px-6 py-5">
            <h3 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-anac-navy outline-none">
              {currentStep.label}
            </h3>
          </div>

          <div className="min-h-[420px] px-6 py-5">
            {currentStep.key === 'general' && (
              <div className="max-w-2xl space-y-5">
                {!isEdit && (
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-anac-navy">
                    La référence sera générée automatiquement lors de l&apos;enregistrement.
                  </div>
                )}
                {isEdit && accordQuery.data && (
                  <div>
                    <Label>Référence</Label>
                    <div className="mt-1 rounded-md border border-anac-border bg-anac-gray px-3 py-2 font-mono text-sm text-anac-navy">
                      {accordQuery.data.reference}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="titre">Titre de l&apos;accord *</Label>
                  <Input id="titre" {...register('titre')} aria-invalid={Boolean(errors.titre)} className="mt-1" />
                  {errors.titre && <p className="mt-1 text-xs text-anac-danger">{errors.titre.message}</p>}
                </div>
                {isEdit && (
                  <div>
                    <Label>Statut</Label>
                    <Controller
                      name="statut"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionner un statut" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCORD_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep.key === 'partners' && (
              <Controller
                name="partenairesIds"
                control={control}
                render={({ field }) => (
                  <PartnerSelection
                    organisations={filteredPartners}
                    selected={selectedPartners}
                    value={field.value}
                    onChange={field.onChange}
                    search={partnerSearch}
                    onSearchChange={setPartnerSearch}
                    error={errors.partenairesIds?.message}
                  />
                )}
              />
            )}

            {currentStep.key === 'validity' && (
              <div className="max-w-3xl space-y-5">
                <div>
                  <Label htmlFor="dateSignature">Date de signature *</Label>
                  <Input id="dateSignature" type="date" {...register('dateSignature')} className="mt-1" />
                  {errors.dateSignature && (
                    <p className="mt-1 text-xs text-anac-danger">{errors.dateSignature.message}</p>
                  )}
                </div>
                <Controller
                  name="avecExpiration"
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
                        <span className="font-semibold text-anac-navy">Accord avec date d&apos;expiration</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(false)}
                        className={`rounded-md border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                          !field.value ? 'border-anac-blue bg-blue-50' : 'border-anac-border bg-white'
                        }`}
                      >
                        <span className="font-semibold text-anac-navy">Accord sans date d&apos;expiration</span>
                      </button>
                    </div>
                  )}
                />
                {values.avecExpiration && (
                  <div>
                    <Label htmlFor="dateExpiration">Date d&apos;expiration *</Label>
                    <Input id="dateExpiration" type="date" {...register('dateExpiration')} className="mt-1" />
                    {errors.dateExpiration && (
                      <p className="mt-1 text-xs text-anac-danger">{errors.dateExpiration.message}</p>
                    )}
                  </div>
                )}
                <div className="rounded-md border border-anac-border bg-anac-gray px-4 py-3">
                  <p className="text-sm font-semibold text-anac-navy">Validité estimée</p>
                  <p className="mt-1 text-sm text-anac-muted">{validityPreview}</p>
                </div>
              </div>
            )}

            {currentStep.key === 'document' && (
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex rounded-md border border-anac-border bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setDocumentMode('upload')}
                    className={`rounded px-3 py-1.5 text-sm font-medium ${documentMode === 'upload' ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted'}`}
                  >
                    Nouveau fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocumentMode('existing')}
                    className={`rounded px-3 py-1.5 text-sm font-medium ${documentMode === 'existing' ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted'}`}
                  >
                    Document existant
                  </button>
                </div>

                {documentLie ? (
                  <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0 text-anac-success" aria-hidden="true" />
                      <span className="truncate font-medium text-anac-navy">{documentLie.nom}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentLie(null);
                        setValue('documentId', undefined, { shouldDirty: true });
                      }}
                      className="text-anac-muted hover:text-anac-danger"
                      aria-label="Retirer le document"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                ) : documentMode === 'upload' ? (
                  <div className="rounded-md border border-dashed border-anac-border px-5 py-8 text-center">
                    <Upload size={22} className="mx-auto text-anac-blue" aria-hidden="true" />
                    <p className="mt-3 font-semibold text-anac-navy">Uploader un document d&apos;accord</p>
                    <p className="mt-1 text-sm text-anac-muted">PDF, Word, image ou TIFF.</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadEnCours}
                      className="mt-4 gap-2"
                    >
                      {uploadEnCours && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                      Choisir un fichier
                    </Button>
                    {uploadErreur && <p className="mt-3 text-sm text-anac-danger">{uploadErreur}</p>}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                      onChange={handleUpload}
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-anac-border">
                    {docsQuery.isLoading ? (
                      <p className="px-4 py-6 text-center text-sm text-anac-muted">Chargement...</p>
                    ) : docsQuery.data?.data.length ? (
                      <div className="max-h-72 divide-y divide-anac-border overflow-y-auto">
                        {docsQuery.data.data.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => {
                              setDocumentLie({ id: doc.id, nom: doc.nomOriginal });
                              setValue('documentId', doc.id, { shouldDirty: true, shouldValidate: true });
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-anac-gray"
                          >
                            <FileText size={16} className="text-anac-muted" aria-hidden="true" />
                            <span>
                              <span className="block font-medium text-anac-navy">{doc.nomOriginal}</span>
                              <span className="text-xs text-anac-muted">{formatAccordDate(doc.createdAt)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-6 text-center text-sm text-anac-muted">
                        Aucun document de type Accord disponible.
                      </p>
                    )}
                  </div>
                )}
                <Button type="button" variant="ghost" onClick={nextStep}>
                  Passer cette étape
                </Button>
              </div>
            )}

            {currentStep.key === 'review' && (
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea id="notes" rows={8} {...register('notes')} className="input mt-1 resize-none" />
                </div>
                <div className="rounded-md border border-anac-border bg-anac-gray p-4">
                  <h4 className="font-semibold text-anac-navy">Vérification</h4>
                  <dl className="mt-3 space-y-3 text-sm">
                    <ReviewItem label="Titre" value={values.titre || '-'} />
                    <ReviewItem label="Partenaires" value={`${selectedPartners.length} sélectionné${selectedPartners.length > 1 ? 's' : ''}`} />
                    <ReviewItem label="Signature" value={formatAccordDate(values.dateSignature)} />
                    <ReviewItem label="Expiration" value={values.avecExpiration ? formatAccordDate(values.dateExpiration) : 'Sans expiration'} />
                    <ReviewItem label="Document" value={documentLie?.nom ?? 'Aucun document lié'} />
                    <ReviewItem label="Notes" value={values.notes ? 'Notes renseignées' : 'Aucune note'} />
                  </dl>
                </div>
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
              <Button type="submit" disabled={saveMutation.isPending} className="gap-2 bg-anac-blue">
                {saveMutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {isEdit ? 'Enregistrer' : "Créer l'accord"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function PartnerSelection({
  organisations,
  selected,
  value,
  onChange,
  search,
  onSearchChange,
  error,
}: {
  organisations: OrganisationOption[];
  selected: OrganisationOption[];
  value: number[];
  onChange: (value: number[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  error?: string;
}) {
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <Label>Organisations disponibles *</Label>
        <div className="relative mt-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} className="pl-9" placeholder="Rechercher une organisation..." />
        </div>
        <div className={`mt-3 max-h-80 overflow-y-auto rounded-md border ${error ? 'border-anac-danger' : 'border-anac-border'}`}>
          {organisations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-anac-muted">Aucune organisation disponible.</p>
          ) : (
            organisations.map((org) => (
              <label key={org.id} className="flex cursor-pointer items-center gap-3 border-b border-anac-border px-4 py-3 last:border-b-0 hover:bg-anac-gray">
                <input
                  type="checkbox"
                  checked={value.includes(org.id)}
                  onChange={() => toggle(org.id)}
                  className="size-4 rounded border-anac-border text-anac-blue focus:ring-anac-sky"
                />
                <span>
                  <span className="block font-medium text-anac-navy">{org.nom}</span>
                  <span className="text-xs text-anac-muted">
                    {org.pays} - {org.type}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
        {error && <p className="mt-2 text-xs text-anac-danger">{error}</p>}
      </div>

      <aside className="rounded-md border border-anac-border bg-anac-gray p-4">
        <h4 className="font-semibold text-anac-navy">Partenaires sélectionnés</h4>
        <p className="mt-1 text-sm text-anac-muted">{selected.length} partenaire{selected.length > 1 ? 's' : ''}</p>
        <div className="mt-4 space-y-2">
          {selected.length === 0 ? (
            <p className="text-sm text-anac-muted">Aucun partenaire sélectionné.</p>
          ) : (
            selected.map((org) => (
              <div key={org.id} className="flex items-center justify-between gap-3 rounded border border-anac-border bg-white px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-anac-navy">{org.nom}</span>
                  <span className="text-xs text-anac-muted">{org.pays}</span>
                </span>
                <button type="button" onClick={() => toggle(org.id)} className="text-anac-muted hover:text-anac-danger" aria-label={`Retirer ${org.nom}`}>
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
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

function buildValidityPreview(signature?: string, expiration?: string, avecExpiration?: boolean) {
  if (!signature) return 'Renseignez la date de signature pour afficher la validité.';
  if (!avecExpiration) return `${formatAccordDate(signature, 'long')} - Sans expiration`;
  if (!expiration) return `${formatAccordDate(signature, 'long')} - échéance à définir`;
  const start = new Date(signature);
  const end = new Date(expiration);
  const years = Math.max(0, Math.round((end.getTime() - start.getTime()) / (365 * 24 * 60 * 60 * 1000)));
  return `${formatAccordDate(signature, 'long')} - ${formatAccordDate(expiration, 'long')} - Durée : ${years || '< 1'} an${years > 1 ? 's' : ''}`;
}
