import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2, Paperclip, Upload, X } from 'lucide-react';

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
import {
  courriersApi,
  type CourrierDirection,
  type CourrierReponseStatut,
} from '@/lib/courriers.api';
import { organisationsApi } from '@/lib/organisations.api';
import { accordsApi } from '@/lib/accords.api';
import { documentsApi } from '@/lib/documents.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface Organisation {
  id: number;
  nom: string;
  pays: string;
}

interface Accord {
  id: number;
  reference: string;
  titre: string;
}

interface CourrierParent {
  id: number;
  reference: string;
  objet: string;
  direction: CourrierDirection;
}

// ── Schema Zod ─────────────────────────────────────────────────────────────
const courrierSchema = z.object({
  direction: z.enum(['entrant', 'sortant']),
  objet: z.string().min(1, "L'objet est requis"),
  dateReception: z.string().min(1, 'La date est requise'),
  reponseRequise: z.enum(['oui', 'non', 'pour_information']),
  expediteurOrganisationId: z.number().optional(),
  destinataireOrganisationId: z.number().optional(),
  dateLimiteReponse: z.string().optional(),
  reponseAId: z.number().optional(),
  accordId: z.number().optional(),
  missionId: z.number().optional(),
  documentId: z.number().optional(),
});

type CourrierFormData = z.infer<typeof courrierSchema>;

// ── Select organisation ────────────────────────────────────────────────────
function SelectOrganisation({
  organisations,
  value,
  onChange,
  placeholder,
}: {
  organisations: Organisation[];
  value?: number;
  onChange: (id: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <Select
      value={value?.toString() ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? undefined : parseInt(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Aucun —</SelectItem>
        {organisations.map((org) => (
          <SelectItem key={org.id} value={org.id.toString()}>
            {org.nom}
            <span className="text-anac-muted text-xs ml-1">· {org.pays}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function CourrierFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // ── Upload document ─────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [documentLie, setDocumentLie] = useState<{ id: number; nom: string } | null>(null);
  const [afficherListeDocs, setAfficherListeDocs] = useState(false);

  const isEdit = !!id;
  const courrierId = id ? parseInt(id) : undefined;
  const reponseAIdParam = searchParams.get('reponseAId');
  const reponseAId = reponseAIdParam ? parseInt(reponseAIdParam) : undefined;

  // ── Charger courrier existant si édition ──────────────────────────────
  const { data: courrier, isLoading: chargementCourrier } = useQuery({
    queryKey: ['courrier', courrierId],
    queryFn: async () => {
      const res = await courriersApi.getById(courrierId!);
      return res.data;
    },
    enabled: isEdit,
  });

  // ── Gestion upload document ─────────────────────────────────────────────
  const { data: docsExistants } = useQuery({
    queryKey: ['documents-correspondances'],
    queryFn: async () => {
      const res = await documentsApi.lister({ categorie: 'correspondance', pageSize: 100 });
      return res.data as { data: { id: number; nomOriginal: string; createdAt: string }[] };
    },
    enabled: afficherListeDocs,
  });

  // ── Charger courrier parent si réponse ────────────────────────────────
  const { data: courrierParent } = useQuery({
    queryKey: ['courrier', reponseAId],
    queryFn: async () => {
      const res = await courriersApi.getById(reponseAId!);
      return res.data as CourrierParent;
    },
    enabled: !!reponseAId,
  });

  // ── Charger organisations ─────────────────────────────────────────────
  const { data: orgsData } = useQuery({
    queryKey: ['organisations-liste'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: Organisation[] };
    },
  });

  // ── Charger accords actifs ────────────────────────────────────────────
  const { data: accordsData } = useQuery({
    queryKey: ['accords-actifs'],
    queryFn: async () => {
      const res = await accordsApi.lister({ statut: 'actif', pageSize: 100 });
      return res.data as { data: Accord[] };
    },
  });

  const organisations = orgsData?.data ?? [];
  const accords = accordsData?.data ?? [];

  // ── Formulaire ────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CourrierFormData>({
    resolver: zodResolver(courrierSchema),
    defaultValues: {
      direction: reponseAId ? 'sortant' : 'entrant',
      objet: reponseAId && courrierParent ? `RE: ${courrierParent.objet}` : '',
      dateReception: new Date().toISOString().split('T')[0],
      reponseRequise: 'oui',
      reponseAId: reponseAId,
      documentId: undefined,
    },
  });

  const directionWatched = watch('direction');
  const reponseRequiseWatched = watch('reponseRequise');

  // Pré-remplir si édition
  useEffect(() => {
    if (courrier) {
      reset({
        direction: courrier.direction,
        objet: courrier.objet,
        dateReception: courrier.dateReception?.split('T')[0] ?? '',
        reponseRequise: courrier.reponseRequise,
        expediteurOrganisationId: courrier.expediteur?.id,
        destinataireOrganisationId: courrier.destinataire?.id,
        dateLimiteReponse: courrier.dateLimiteReponse?.split('T')[0] ?? '',
        reponseAId: courrier.reponseAId,
        accordId: courrier.accordId,
        missionId: courrier.missionId,
      });
    }
  }, [courrier, reset]);

  // Pré-remplir objet quand le courrier parent est chargé (mode réponse)
  useEffect(() => {
    if (courrierParent && !isEdit) {
      reset((prev) => ({
        ...prev,
        objet: `RE: ${courrierParent.objet}`,
        reponseAId: courrierParent.id,
      }));
    }
  }, [courrierParent, isEdit, reset]);

  // ── Charger document lié si édition ─────────────────────────────────
  useEffect(() => {
    if (courrier?.documentId) {
      documentsApi.getById(courrier.documentId).then((res) => {
        setDocumentLie({ id: res.data.id, nom: res.data.nomOriginal });
      });
    }
  }, [courrier]);

  // ── Mutations ─────────────────────────────────────────────────────────
  const creerMutation = useMutation({
    mutationFn: (data: CourrierFormData) =>
      courriersApi.creer({
        direction: data.direction,
        objet: data.objet,
        dateReception: data.dateReception,
        reponseRequise: data.reponseRequise as CourrierReponseStatut,
        expediteurOrganisationId: data.expediteurOrganisationId,
        destinataireOrganisationId: data.destinataireOrganisationId,
        dateLimiteReponse: data.dateLimiteReponse || undefined,
        reponseAId: data.reponseAId,
        accordId: data.accordId,
        missionId: data.missionId,
        documentId: data.documentId,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['courriers'] });
      // Naviguer vers le nouveau courrier créé
      navigate(`/courriers/${res.data.id}`);
    },
  });

  const modifierMutation = useMutation({
    mutationFn: (data: CourrierFormData) =>
      courriersApi.mettreAJour(courrierId!, {
        objet: data.objet,
        dateLimiteReponse: data.dateLimiteReponse || undefined,
        accordId: data.accordId,
        missionId: data.missionId,
        documentId: data.documentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courriers'] });
      queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      navigate(`/courriers/${courrierId}`);
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setUploadEnCours(true);
    setUploadErreur(null);
    try {
      const res = await documentsApi.upload(fichier, 'correspondance');
      const { document } = res.data;
      setDocumentLie({ id: document.id, nom: document.nomOriginal });
      setValue('documentId', document.id);
    } catch {
      setUploadErreur("Erreur lors de l'upload.");
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function onSubmit(data: CourrierFormData) {
    if (isEdit) {
      modifierMutation.mutate(data);
    } else {
      creerMutation.mutate(data);
    }
  }

  const isPending = creerMutation.isPending || modifierMutation.isPending;
  const erreurServeur = creerMutation.error || modifierMutation.error;

  // ── Chargement initial ────────────────────────────────────────────────
  if (isEdit && chargementCourrier) {
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
          onClick={() => navigate(courrierId ? `/courriers/${courrierId}` : '/courriers')}
          className="gap-1.5"
        >
          <ArrowLeft size={13} /> Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-anac-navy">
            {isEdit
              ? 'Modifier le courrier'
              : reponseAId
                ? 'Répondre au courrier'
                : 'Nouveau courrier'}
          </h2>
          {courrier && <p className="text-anac-muted text-sm font-mono">{courrier.reference}</p>}
        </div>
      </div>

      {/* ── Contexte réponse ─────────────────────────────────────────── */}
      {courrierParent && !isEdit && (
        <div className="card p-4 border-l-4 border-anac-sky/40 space-y-1">
          <p className="text-xs text-anac-muted font-medium uppercase tracking-wide">
            En réponse à
          </p>
          <p className="text-sm font-medium text-anac-navy">{courrierParent.objet}</p>
          <p className="font-mono text-xs text-anac-muted">{courrierParent.reference}</p>
        </div>
      )}

      {/* ── Erreur serveur ────────────────────────────────────────────── */}
      {erreurServeur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {(erreurServeur as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Une erreur est survenue.'}
        </div>
      )}

      {/* ── Formulaire ───────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-6 space-y-5">
        {/* Direction — désactivée en édition et en mode réponse */}
        <div className="space-y-1.5">
          <Label>Direction *</Label>
          <Controller
            name="direction"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEdit || !!reponseAId}
              >
                <SelectTrigger aria-invalid={!!errors.direction}>
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

        {/* Objet */}
        <div className="space-y-1.5">
          <Label htmlFor="objet">Objet *</Label>
          <Input
            id="objet"
            {...register('objet')}
            placeholder="Objet du courrier..."
            aria-invalid={!!errors.objet}
          />
          {errors.objet && <p className="text-[11px] text-anac-danger">{errors.objet.message}</p>}
        </div>

        {/* Date + Réponse requise */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dateReception">
              {directionWatched === 'entrant' ? 'Date de réception *' : "Date d'envoi *"}
            </Label>
            <Input
              id="dateReception"
              type="date"
              {...register('dateReception')}
              disabled={isEdit}
              aria-invalid={!!errors.dateReception}
            />
            {errors.dateReception && (
              <p className="text-[11px] text-anac-danger">{errors.dateReception.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Réponse requise *</Label>
            <Controller
              name="reponseRequise"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger>
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

        {/* Date limite — seulement si réponse requise = oui */}
        {reponseRequiseWatched === 'oui' && (
          <div className="space-y-1.5">
            <Label htmlFor="dateLimiteReponse">Date limite de réponse</Label>
            <Input id="dateLimiteReponse" type="date" {...register('dateLimiteReponse')} />
          </div>
        )}

        {/* Expéditeur / Destinataire — désactivés en édition */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Expéditeur</Label>
              <Controller
                name="expediteurOrganisationId"
                control={control}
                render={({ field }) => (
                  <SelectOrganisation
                    organisations={organisations}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Sélectionner..."
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Destinataire</Label>
              <Controller
                name="destinataireOrganisationId"
                control={control}
                render={({ field }) => (
                  <SelectOrganisation
                    organisations={organisations}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Sélectionner..."
                  />
                )}
              />
            </div>
          </div>
        )}

        {/* Rattachement accord */}
        <div className="space-y-1.5">
          <Label>
            Rattacher à un accord <span className="text-anac-muted font-normal">(optionnel)</span>
          </Label>
          <Controller
            name="accordId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value?.toString() ?? '__none__'}
                onValueChange={(v) => field.onChange(v === '__none__' ? undefined : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— Aucun accord —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun accord —</SelectItem>
                  {accords.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      <span className="font-mono text-xs">{a.reference}</span>
                      <span className="ml-2 text-anac-muted text-xs truncate">{a.titre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Document joint */}
        <div className="space-y-1.5">
          <Label>
            Document joint <span className="text-anac-muted font-normal">(optionnel)</span>
          </Label>

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
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
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
                      <Loader2 size={12} className="animate-spin" /> Upload...
                    </>
                  ) : (
                    <>
                      <Upload size={12} /> Uploader
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
                  {afficherListeDocs ? 'Masquer' : 'Lier un existant'}
                </Button>
              </div>

              {afficherListeDocs && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {!docsExistants ? (
                    <p className="text-anac-muted text-sm px-3 py-4 text-center">
                      <Loader2 size={13} className="animate-spin inline mr-2" />
                      Chargement...
                    </p>
                  ) : docsExistants.data.length === 0 ? (
                    <p className="text-anac-muted text-sm px-3 py-4 text-center">
                      Aucun document de type &quot;Correspondance&quot; dans M8.
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

          {uploadErreur && <p className="text-[11px] text-anac-danger">{uploadErreur}</p>}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
            onChange={handleUpload}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(courrierId ? `/courriers/${courrierId}` : '/courriers')}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" /> {t('common.loading')}
              </>
            ) : isEdit ? (
              t('common.save')
            ) : reponseAId ? (
              'Envoyer la réponse'
            ) : (
              'Créer le courrier'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
