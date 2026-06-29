import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  ArrowRight,
  FileText,
  AlignLeft,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { demandesApi, type DemandeStatut, type DemandePriorite } from '@/lib/demandes.api';
import { documentsApi } from '@/lib/documents.api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App'; // ou ton context auth

// ── Types ──────────────────────────────────────────────────────────────────
interface Demande {
  id: number;
  demandeurId: number;
  demandeurNom?: string;
  traducteurId?: number;
  traducteurNom?: string;
  documentId?: number;
  documentNom?: string;
  texteLibre?: string;
  direction: 'fr_en' | 'en_fr';
  prioriteDemandee: DemandePriorite;
  prioriteValidee?: DemandePriorite;
  statut: DemandeStatut;
  traductionId?: number;
  verrou: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: number;
  nomOriginal: string;
  statutOCR: string;
}

// ── Schema Zod ─────────────────────────────────────────────────────────────
const demandeSchema = z
  .object({
    direction: z.enum(['fr_en', 'en_fr']),
    priorite: z.enum(['normale', 'urgente']),
    type: z.enum(['document', 'texte']),
    documentId: z.number().optional(),
    texteLibre: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'document') return !!data.documentId;
      if (data.type === 'texte') return !!data.texteLibre?.trim();
      return false;
    },
    { message: 'Un document ou un texte est requis.', path: ['documentId'] }
  );

type DemandeFormData = z.infer<typeof demandeSchema>;

// ── Badges ─────────────────────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: DemandeStatut }) {
  const config: Record<DemandeStatut, { label: string; classe: string; icone: React.ReactNode }> = {
    soumise: { label: 'Soumise', classe: 'badge-info', icone: <Clock size={10} /> },
    en_cours: { label: 'En cours', classe: 'badge-warning', icone: <ArrowRight size={10} /> },
    en_relecture: { label: 'En relecture', classe: 'badge-info', icone: <Clock size={10} /> },
    validee: { label: 'Validée', classe: 'badge-actif', icone: <CheckCircle2 size={10} /> },
    archivee: { label: 'Archivée', classe: 'badge-expire', icone: <Archive size={10} /> },
  };
  const { label, classe, icone } = config[statut];
  return (
    <span className={`${classe} inline-flex items-center gap-1`}>
      {icone} {label}
    </span>
  );
}

function BadgePriorite({ priorite }: { priorite: DemandePriorite }) {
  if (priorite === 'urgente') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 rounded px-1.5 py-0.5">
        <AlertCircle size={10} /> Urgente
      </span>
    );
  }
  return <span className="text-[11px] text-anac-muted">Normale</span>;
}

const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'soumise', label: 'Soumise' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_relecture', label: 'En relecture' },
  { value: 'validee', label: 'Validée' },
  { value: 'archivee', label: 'Archivée' },
];

const FILTRES_PRIORITE = [
  { value: '__all__', label: 'Toutes priorités' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'normale', label: 'Normale' },
];

// ── Composant principal ────────────────────────────────────────────────────
export default function DemandesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [page, setPage] = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [modalPriorite, setModalPriorite] = useState<Demande | null>(null);
  const [nouvellePriorite, setNouvellePriorite] = useState<DemandePriorite>('normale');
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);

  // ── Formulaire nouvelle demande ───────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DemandeFormData>({
    resolver: zodResolver(demandeSchema),
    defaultValues: {
      direction: 'fr_en',
      priorite: 'normale',
      type: 'document',
    },
  });

  const typeWatched = watch('type');

  // ── Requête liste demandes ────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['demandes', statut, priorite, page],
    queryFn: async () => {
      const res = await demandesApi.lister({
        statut: statut ? (statut as DemandeStatut) : undefined,
        priorite: priorite ? (priorite as DemandePriorite) : undefined,
        page,
        pageSize: 20,
      });
      return res.data as { data: Demande[]; total: number };
    },
  });

  // ── Requête documents disponibles (avec texte OCR) ────────────────────
  const { data: docsData } = useQuery({
    queryKey: ['documents-ocr-traite'],
    queryFn: async () => {
      const res = await documentsApi.lister({ statutOCR: 'traite', pageSize: 100 });
      return res.data as { data: Document[] };
    },
    enabled: modalNouvelle && typeWatched === 'document',
  });

  const documents = docsData?.data ?? [];

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  // ── Mutations ─────────────────────────────────────────────────────────
  const creerMutation = useMutation({
    mutationFn: (formData: DemandeFormData) =>
      demandesApi.creer({
        direction: formData.direction,
        priorite: formData.priorite,
        documentId: formData.type === 'document' ? formData.documentId : undefined,
        texteLibre: formData.type === 'texte' ? formData.texteLibre : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
      setModalNouvelle(false);
      reset();
      setErreurCreation(null);
    },
    onError: (err: unknown) => {
      setErreurCreation(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la création.'
      );
    },
  });

  const prendreEnChargeMutation = useMutation({
    mutationFn: (id: number) => demandesApi.prendreEnCharge(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
      // Naviguer vers l'éditeur si traduction créée
      if (res.data.traductionId) {
        navigate(`/traductions/${res.data.traductionId}`);
      }
    },
    onError: (err: unknown) => {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la prise en charge.'
      );
    },
  });

  const rappelerMutation = useMutation({
    mutationFn: (id: number) => demandesApi.rappeler(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demandes'] }),
  });

  const passerEnRelectureMutation = useMutation({
    mutationFn: (id: number) => demandesApi.passerEnRelecture(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demandes'] }),
  });

  const validerMutation = useMutation({
    mutationFn: (id: number) => demandesApi.valider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demandes'] }),
  });

  const archiverMutation = useMutation({
    mutationFn: (id: number) => demandesApi.archiver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demandes'] }),
  });

  const validerPrioriteMutation = useMutation({
    mutationFn: ({ id, priorite }: { id: number; priorite: DemandePriorite }) =>
      demandesApi.validerPriorite(id, priorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
      setModalPriorite(null);
    },
  });

  function formaterDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  function apercu(texte?: string) {
    if (!texte) return '—';
    return texte.length > 60 ? texte.slice(0, 60) + '...' : texte;
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Demandes de traduction</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} demande{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setModalNouvelle(true)} className="gap-2">
          <Plus size={13} /> Nouvelle demande
        </Button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3">
        <Select
          value={statut || '__all__'}
          onValueChange={(v) => {
            setStatut(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTRES_STATUT.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorite || '__all__'}
          onValueChange={(v) => {
            setPriorite(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTRES_PRIORITE.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statut || priorite) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStatut('');
              setPriorite('');
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-4 py-3">Contenu</th>
              <th className="text-left px-4 py-3">Direction</th>
              <th className="text-left px-4 py-3">Priorité</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Demandeur</th>
              <th className="text-left px-4 py-3">Traducteur</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-anac-muted">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  {t('common.loading')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-anac-muted">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              data?.data.map((demande) => {
                const estDemandeur = demande.demandeurId === user?.id;
                const estTraducteur = demande.traducteurId === user?.id;
                const prioriteActive = demande.prioriteValidee ?? demande.prioriteDemandee;

                return (
                  <tr key={demande.id} className="table-row">
                    {/* Contenu */}
                    <td className="px-4 py-3">
                      {demande.documentNom ? (
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="text-anac-muted shrink-0" />
                          <span className="text-anac-navy font-medium truncate max-w-[160px]">
                            {demande.documentNom}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlignLeft size={12} className="text-anac-muted shrink-0" />
                          <span className="text-anac-muted truncate max-w-[160px]">
                            {apercu(demande.texteLibre)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Direction */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-anac-muted font-medium">
                        {demande.direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
                      </span>
                    </td>

                    {/* Priorité */}
                    <td className="px-4 py-3">
                      <BadgePriorite priorite={prioriteActive} />
                      {demande.prioriteValidee &&
                        demande.prioriteValidee !== demande.prioriteDemandee && (
                          <div className="text-[10px] text-anac-muted mt-0.5">
                            Demandée : {demande.prioriteDemandee}
                          </div>
                        )}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <BadgeStatut statut={demande.statut} />
                    </td>

                    {/* Demandeur */}
                    <td className="px-4 py-3 text-anac-muted text-xs">
                      {demande.demandeurNom ?? '—'}
                    </td>

                    {/* Traducteur */}
                    <td className="px-4 py-3 text-anac-muted text-xs">
                      {demande.traducteurNom ?? <span className="italic">Non assigné</span>}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-anac-muted text-xs">
                      {formaterDate(demande.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Voir traduction si liée */}
                        {demande.traductionId && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate(`/traductions/${demande.traductionId}`)}
                            className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy gap-1"
                          >
                            <ExternalLink size={10} /> Traduction
                          </Button>
                        )}

                        {/* Prendre en charge — traducteur, si soumise */}
                        {(demande.statut === 'soumise' &&
                          !demande.verrou &&
                          user?.role === 'traducteur') ||
                        user?.role === 'admin' ||
                        user?.role === 'super_admin' ? (
                          <>
                            {demande.statut === 'soumise' && !demande.verrou && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => prendreEnChargeMutation.mutate(demande.id)}
                                disabled={prendreEnChargeMutation.isPending}
                                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                              >
                                {prendreEnChargeMutation.isPending ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  'Prendre en charge'
                                )}
                              </Button>
                            )}
                          </>
                        ) : null}

                        {/* Rappeler — demandeur si soumise */}
                        {estDemandeur && demande.statut === 'soumise' && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              if (confirm('Rappeler cette demande ?')) {
                                rappelerMutation.mutate(demande.id);
                              }
                            }}
                            className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                          >
                            Rappeler
                          </Button>
                        )}

                        {/* Passer en relecture — traducteur assigné */}
                        {estTraducteur && demande.statut === 'en_cours' && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => passerEnRelectureMutation.mutate(demande.id)}
                            disabled={passerEnRelectureMutation.isPending}
                            className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                          >
                            Soumettre
                          </Button>
                        )}

                        {/* Valider priorité — admin/relecteur */}
                        {(user?.role === 'relecteur' ||
                          user?.role === 'admin' ||
                          user?.role === 'super_admin') &&
                          !demande.prioriteValidee &&
                          demande.statut !== 'archivee' && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setModalPriorite(demande);
                                setNouvellePriorite(demande.prioriteDemandee);
                              }}
                              className="h-auto p-0 text-xs text-amber-600 hover:text-amber-800"
                            >
                              Priorité
                            </Button>
                          )}

                        {/* Valider — relecteur */}
                        {(user?.role === 'relecteur' ||
                          user?.role === 'admin' ||
                          user?.role === 'super_admin') &&
                          demande.statut === 'en_relecture' && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => validerMutation.mutate(demande.id)}
                              disabled={validerMutation.isPending}
                              className="h-auto p-0 text-xs text-green-600 hover:text-green-800"
                            >
                              Valider
                            </Button>
                          )}

                        {/* Archiver — relecteur */}
                        {(user?.role === 'relecteur' ||
                          user?.role === 'admin' ||
                          user?.role === 'super_admin') &&
                          demande.statut === 'validee' && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => archiverMutation.mutate(demande.id)}
                              disabled={archiverMutation.isPending}
                              className="h-auto p-0 text-xs text-anac-muted hover:text-anac-navy"
                            >
                              Archiver
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-anac-muted">
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p: any) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft size={13} /> Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p: any) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1.5"
            >
              Suivant <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal : Nouvelle demande ──────────────────────────────────── */}
      <Dialog
        open={modalNouvelle}
        onOpenChange={(open) => {
          if (!open) {
            setModalNouvelle(false);
            reset();
            setErreurCreation(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de traduction</DialogTitle>
            <DialogDescription>
              Soumettez un document ou un texte libre pour traduction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((data) => creerMutation.mutate(data))} noValidate>
            <DialogBody className="space-y-4">
              {/* Direction + Priorité */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Direction *</Label>
                  <Controller
                    name="direction"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr_en">Français → Anglais</SelectItem>
                          <SelectItem value="en_fr">Anglais → Français</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Controller
                    name="priorite"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normale">Normale</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Type : document ou texte libre */}
              <div className="space-y-1.5">
                <Label>Type de contenu *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="document"
                          checked={field.value === 'document'}
                          onChange={() => {
                            field.onChange('document');
                            setValue('texteLibre', '');
                          }}
                          className="text-anac-sky focus:ring-anac-sky"
                        />
                        <span className="text-sm flex items-center gap-1.5">
                          <FileText size={13} /> Document archivé
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="texte"
                          checked={field.value === 'texte'}
                          onChange={() => {
                            field.onChange('texte');
                            setValue('documentId', undefined);
                          }}
                          className="text-anac-sky focus:ring-anac-sky"
                        />
                        <span className="text-sm flex items-center gap-1.5">
                          <AlignLeft size={13} /> Texte libre
                        </span>
                      </label>
                    </div>
                  )}
                />
              </div>

              {/* Document ou texte selon le type */}
              {typeWatched === 'document' ? (
                <div className="space-y-1.5">
                  <Label>Document *</Label>
                  <Controller
                    name="documentId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString() ?? '__none__'}
                        onValueChange={(v) =>
                          field.onChange(v === '__none__' ? undefined : parseInt(v))
                        }
                      >
                        <SelectTrigger aria-invalid={!!errors.documentId}>
                          <SelectValue placeholder="Sélectionner un document..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Choisir —</SelectItem>
                          {documents.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id.toString()}>
                              {doc.nomOriginal}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {documents.length === 0 && (
                    <p className="text-xs text-anac-muted">
                      Aucun document avec OCR traité disponible.
                    </p>
                  )}
                  {errors.documentId && (
                    <p className="text-[11px] text-anac-danger">{errors.documentId.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="texte-libre">Texte à traduire *</Label>
                  <textarea
                    id="texte-libre"
                    {...register('texteLibre')}
                    rows={8}
                    className="input resize-none text-sm font-mono"
                    placeholder="Saisissez le texte à traduire..."
                  />
                </div>
              )}

              {erreurCreation && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {erreurCreation}
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalNouvelle(false);
                  reset();
                  setErreurCreation(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={creerMutation.isPending} className="gap-2">
                {creerMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Soumission...
                  </>
                ) : (
                  'Soumettre la demande'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Valider priorité ──────────────────────────────────── */}
      <Dialog
        open={!!modalPriorite}
        onOpenChange={(open) => {
          if (!open) setModalPriorite(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Valider la priorité</DialogTitle>
            <DialogDescription>
              Priorité demandée : <strong>{modalPriorite?.prioriteDemandee}</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Label>Priorité validée</Label>
            <Select
              value={nouvellePriorite}
              onValueChange={(v) => setNouvellePriorite(v as DemandePriorite)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalPriorite(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (modalPriorite) {
                  validerPrioriteMutation.mutate({
                    id: modalPriorite.id,
                    priorite: nouvellePriorite,
                  });
                }
              }}
              disabled={validerPrioriteMutation.isPending}
              className="gap-2"
            >
              {validerPrioriteMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Validation...
                </>
              ) : (
                'Confirmer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
