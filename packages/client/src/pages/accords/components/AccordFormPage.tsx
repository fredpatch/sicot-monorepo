/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2, Paperclip, RefreshCw, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { accordsApi, type AccordStatut } from '@/lib/accords.api';
import { organisationsApi } from '@/lib/organisations.api';
import { documentsApi } from '@/lib/api';

// ── Schema Zod ─────────────────────────────────────────────────────────────
const accordSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  dateSignature: z.string().min(1, 'La date de signature est requise'),
  dateExpiration: z.string().optional(),
  statut: z.enum(['actif', 'expire', 'suspendu', 'en_renouvellement']).optional(),
  partenairesIds: z.array(z.number()).min(1, 'Au moins un partenaire est requis'),
  documentId: z.number().optional(),
  notes: z.string().optional(),
});

// Schema renouvellement — plus simple
const renouvellementSchema = z.object({
  dateSignature: z.string().min(1, 'La date de signature est requise'),
  dateExpiration: z.string().optional(),
  notes: z.string().optional(),
});

type AccordFormData = z.infer<typeof accordSchema>;
type RenouvellementFormData = z.infer<typeof renouvellementSchema>;

// ── Types ──────────────────────────────────────────────────────────────────
interface Organisation {
  id: number;
  nom: string;
  pays: string;
  type: string;
}

// ── Sélecteur multi-partenaires ────────────────────────────────────────────
// Checkboxes simples — pas de composant externe
function SelectPartenaires({
  organisations,
  value,
  onChange,
  erreur,
}: {
  organisations: Organisation[];
  value: number[];
  onChange: (ids: number[]) => void;
  erreur?: string;
}) {
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div>
      <div
        className={`border rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 ${
          erreur ? 'border-anac-danger' : 'border-gray-200'
        }`}
      >
        {organisations.length === 0 ? (
          <p className="text-anac-muted text-sm px-3 py-4 text-center">
            Aucune organisation disponible
          </p>
        ) : (
          organisations.map((org) => (
            <label
              key={org.id}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(org.id)}
                onChange={() => toggle(org.id)}
                className="rounded border-gray-300 text-anac-sky focus:ring-anac-sky"
              />
              <div>
                <div className="text-sm font-medium text-anac-navy">{org.nom}</div>
                <div className="text-xs text-anac-muted">{org.pays}</div>
              </div>
            </label>
          ))
        )}
      </div>
      {erreur && <p className="text-[11px] text-anac-danger mt-1">{erreur}</p>}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function AccordFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  // ── Upload de document lié ─────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [documentLie, setDocumentLie] = useState<{ id: number; nom: string } | null>(null);
  const [afficherListeDocs, setAfficherListeDocs] = useState(false);

  const isEdit = !!id;
  const accordId = id ? parseInt(id) : undefined;

  // ── Charger la liste des documents existants ─────────────────────────
  const { data: docsExistants } = useQuery({
    queryKey: ['documents-accords'],
    queryFn: async () => {
      const res = await documentsApi.lister({ categorie: 'accord', pageSize: 100 });
      return res.data as {
        data: { id: number; nomOriginal: string; createdAt: string }[];
        total: number;
      };
    },
    enabled: afficherListeDocs,
  });

  // ── Charger l'accord existant si édition ──────────────────────────────
  const { data: accord, isLoading: chargementAccord } = useQuery({
    queryKey: ['accord', accordId],
    queryFn: async () => {
      const res = await accordsApi.getById(accordId!);
      return res.data;
    },
    enabled: isEdit,
  });

  // ── Charger la liste des organisations ────────────────────────────────
  const { data: orgsData, isLoading: chargementOrgs } = useQuery({
    queryKey: ['organisations-liste'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: Organisation[]; total: number };
    },
  });

  const organisations = orgsData?.data ?? [];

  // ── Formulaire principal ──────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AccordFormData>({
    resolver: zodResolver(accordSchema),
    defaultValues: {
      titre: '',
      dateSignature: '',
      dateExpiration: '',
      partenairesIds: [],
      notes: '',
    },
  });

  // Pré-remplir le formulaire quand l'accord est chargé
  useEffect(() => {
    if (accord) {
      reset({
        titre: accord.titre,
        dateSignature: accord.dateSignature?.split('T')[0] ?? '',
        dateExpiration: accord.dateExpiration?.split('T')[0] ?? '',
        statut: accord.statut,
        partenairesIds: accord.partenaires.map((p: { id: number }) => p.id),
        documentId: accord.documentId ?? undefined,
        notes: accord.notes ?? '',
      });

      // Charger le nom du document lié si existant
      if (accord.documentId) {
        documentsApi.getById(accord.documentId).then((res) => {
          setDocumentLie({ id: res.data.id, nom: res.data.nomOriginal });
        });
      }
    }
  }, [accord, reset]);

  // ── Formulaire renouvellement ─────────────────────────────────────────
  const renouvellementForm = useForm<RenouvellementFormData>({
    resolver: zodResolver(renouvellementSchema),
    defaultValues: { dateSignature: '', dateExpiration: '', notes: '' },
  });

  const [modeRenouvellement, setModeRenouvellement] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────────
  const creerMutation = useMutation({
    mutationFn: (data: AccordFormData) =>
      accordsApi.creer({
        titre: data.titre,
        dateSignature: data.dateSignature,
        dateExpiration: data.dateExpiration || undefined,
        partenairesIds: data.partenairesIds,
        documentId: data.documentId, // ← manquait
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accords'] });
      navigate('/accords');
    },
  });

  const modifierMutation = useMutation({
    mutationFn: (data: AccordFormData) =>
      accordsApi.mettreAJour(accordId!, {
        titre: data.titre,
        dateSignature: data.dateSignature,
        dateExpiration: data.dateExpiration || undefined,
        statut: data.statut,
        partenairesIds: data.partenairesIds,
        documentId: data.documentId, // ← manquait
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accords'] });
      queryClient.invalidateQueries({ queryKey: ['accord', accordId] });
      navigate('/accords');
    },
  });

  const renouvelerMutation = useMutation({
    mutationFn: (data: RenouvellementFormData) =>
      accordsApi.renouveler(accordId!, {
        dateSignature: data.dateSignature,
        dateExpiration: data.dateExpiration || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accords'] });
      navigate('/accords');
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setUploadEnCours(true);
    setUploadErreur(null);

    try {
      const res = await documentsApi.upload(fichier, 'accord');
      const { document, doublon } = res.data;

      setDocumentLie({ id: document.id, nom: document.nomOriginal });
      setValue('documentId', document.id); // <-- injecte dans le form

      if (doublon) {
        setUploadErreur(
          '⚠️ Un fichier identique existe déjà dans M8. Le document a quand même été lié.'
        );
      }
    } catch {
      setUploadErreur("Erreur lors de l'upload. Vérifiez le fichier et réessayez.");
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  function onSubmit(data: AccordFormData) {
    if (isEdit) {
      modifierMutation.mutate(data);
    } else {
      creerMutation.mutate(data);
    }
  }

  function onRenouvellementSubmit(data: RenouvellementFormData) {
    renouvelerMutation.mutate(data);
  }

  const isPending = creerMutation.isPending || modifierMutation.isPending;
  const erreurServeur = creerMutation.error || modifierMutation.error || renouvelerMutation.error;

  // ── Chargement initial ────────────────────────────────────────────────
  if (isEdit && chargementAccord) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/accords')}
          className="gap-1.5"
        >
          <ArrowLeft size={13} />
          Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-anac-navy">
            {isEdit ? "Modifier l'accord" : 'Nouvel accord'}
          </h2>
          {accord && <p className="text-anac-muted text-sm font-mono">{accord.reference}</p>}
        </div>
      </div>

      {/* ── Erreur serveur ────────────────────────────────────────────── */}
      {erreurServeur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {(erreurServeur as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Une erreur est survenue.'}
        </div>
      )}

      {/* ── Mode renouvellement (édition seulement) ───────────────────── */}
      {isEdit && !modeRenouvellement && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-anac-navy">Renouveler cet accord</p>
            <p className="text-xs text-anac-muted mt-0.5">
              Crée une nouvelle version liée à cet accord. L&apos;accord actuel passera en statut
              &quot;En renouvellement&quot;.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModeRenouvellement(true)}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw size={13} />
            Renouveler
          </Button>
        </div>
      )}

      {/* ── Formulaire renouvellement ─────────────────────────────────── */}
      {isEdit && modeRenouvellement && (
        <div className="card p-6 border-2 border-anac-sky/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-anac-navy flex items-center gap-2">
              <RefreshCw size={14} className="text-anac-sky" />
              Renouvellement de l&apos;accord
            </h3>
            <Button variant="secondary" size="sm" onClick={() => setModeRenouvellement(false)}>
              Annuler
            </Button>
          </div>

          <form
            onSubmit={renouvellementForm.handleSubmit(onRenouvellementSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ren-dateSignature">Date de signature *</Label>
                <Input
                  id="ren-dateSignature"
                  type="date"
                  {...renouvellementForm.register('dateSignature')}
                  aria-invalid={!!renouvellementForm.formState.errors.dateSignature}
                />
                {renouvellementForm.formState.errors.dateSignature && (
                  <p className="text-[11px] text-anac-danger">
                    {renouvellementForm.formState.errors.dateSignature.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ren-dateExpiration">Date d&apos;expiration</Label>
                <Input
                  id="ren-dateExpiration"
                  type="date"
                  {...renouvellementForm.register('dateExpiration')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ren-notes">Notes</Label>
              <textarea
                id="ren-notes"
                {...renouvellementForm.register('notes')}
                rows={3}
                className="input resize-none"
                placeholder="Notes sur ce renouvellement..."
              />
            </div>

            <Button type="submit" disabled={renouvelerMutation.isPending} className="gap-2 w-full">
              {renouvelerMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Renouvellement en cours...
                </>
              ) : (
                <>
                  <RefreshCw size={13} /> Confirmer le renouvellement
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* ── Formulaire principal ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-6 space-y-5">
        {/* Titre */}
        <div className="space-y-1.5">
          <Label htmlFor="titre">Titre de l&apos;accord *</Label>
          <Input
            id="titre"
            {...register('titre')}
            placeholder="ex : Accord de coopération technique ANAC-OACI"
            aria-invalid={!!errors.titre}
          />
          {errors.titre && <p className="text-[11px] text-anac-danger">{errors.titre.message}</p>}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dateSignature">Date de signature *</Label>
            <Input
              id="dateSignature"
              type="date"
              {...register('dateSignature')}
              aria-invalid={!!errors.dateSignature}
            />
            {errors.dateSignature && (
              <p className="text-[11px] text-anac-danger">{errors.dateSignature.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateExpiration">Date d&apos;expiration</Label>
            <Input id="dateExpiration" type="date" {...register('dateExpiration')} />
          </div>
        </div>

        {/* Statut — visible seulement en édition */}
        {isEdit && (
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Controller
              name="statut"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="expire">Expiré</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="en_renouvellement">En renouvellement</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Partenaires */}
        <div className="space-y-1.5">
          <Label>
            Partenaires *
            {chargementOrgs && (
              <Loader2 size={11} className="animate-spin inline ml-2 text-anac-muted" />
            )}
          </Label>
          <Controller
            name="partenairesIds"
            control={control}
            render={({ field }) => (
              <SelectPartenaires
                organisations={organisations}
                value={field.value}
                onChange={field.onChange}
                erreur={errors.partenairesIds?.message}
              />
            )}
          />
        </div>

        {/* Document lié */}
        <div className="space-y-1.5">
          <Label>Document de référence</Label>

          {/* Document déjà lié */}
          {documentLie ? (
            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <span className="text-sm text-anac-navy font-medium truncate max-w-xs">
                  {documentLie.nom}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocumentLie(null);
                  setValue('documentId', undefined);
                  setAfficherListeDocs(false);
                }}
                className="text-anac-muted hover:text-anac-danger transition-colors"
                aria-label="Retirer le document"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Deux boutons d'action */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadEnCours}
                  className="gap-1.5"
                >
                  {uploadEnCours ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload size={12} /> Uploader un fichier
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAfficherListeDocs((v) => !v)}
                  className="gap-1.5"
                >
                  <Paperclip size={12} />
                  {afficherListeDocs ? 'Masquer la liste' : 'Lier un document existant'}
                </Button>
              </div>

              {/* Liste des documents existants */}
              {afficherListeDocs && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {!docsExistants ? (
                    <p className="text-anac-muted text-sm px-3 py-4 text-center">
                      <Loader2 size={13} className="animate-spin inline mr-2" />
                      Chargement...
                    </p>
                  ) : docsExistants.data.length === 0 ? (
                    <p className="text-anac-muted text-sm px-3 py-4 text-center">
                      Aucun document de type &quot;Accord&quot; dans M8.
                    </p>
                  ) : (
                    docsExistants.data.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setDocumentLie({ id: doc.id, nom: doc.nomOriginal });
                          setValue('documentId', doc.id);
                          setAfficherListeDocs(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-anac-navy">{doc.nomOriginal}</div>
                        <div className="text-xs text-anac-muted">
                          {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Erreur upload */}
          {uploadErreur && <p className="text-[11px] text-anac-danger">{uploadErreur}</p>}

          {/* Input fichier caché */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
            onChange={handleUpload}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={4}
            className="input resize-none"
            placeholder="Informations complémentaires..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/accords')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" /> {t('common.loading')}
              </>
            ) : isEdit ? (
              t('common.save')
            ) : (
              "Créer l'accord"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
