import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronLeft, ChevronRight, Loader2, History, EyeOff, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { glossaireApi } from '@/lib/glossaire.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface HistoriqueEntry {
  id: number;
  ancienTermeFr?: string;
  ancienTermeEn?: string;
  modifieParNom?: string;
  createdAt: string;
}

interface Terme {
  id: number;
  termeFr: string;
  termeEn: string;
  domaine?: string;
  contexte?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  historique?: HistoriqueEntry[];
}

// ── Schema Zod ─────────────────────────────────────────────────────────────
const termeSchema = z.object({
  termeFr: z.string().min(1, 'Le terme FR est requis'),
  termeEn: z.string().min(1, 'Le terme EN est requis'),
  domaine: z.string().optional(),
  contexte: z.string().optional(),
});
type TermeFormData = z.infer<typeof termeSchema>;

// ── Formulaire terme ───────────────────────────────────────────────────────
interface FormulaireTermeProps {
  initial?: Partial<Terme>;
  onSubmit: (data: TermeFormData) => void;
  onCancel: () => void;
  chargement: boolean;
}

function FormulaireTerme({ initial, onSubmit, onCancel, chargement }: FormulaireTermeProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TermeFormData>({
    resolver: zodResolver(termeSchema),
    defaultValues: {
      termeFr: initial?.termeFr ?? '',
      termeEn: initial?.termeEn ?? '',
      domaine: initial?.domaine ?? '',
      contexte: initial?.contexte ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Termes FR / EN côte à côte */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="termeFr">Terme français *</Label>
          <Input
            id="termeFr"
            {...register('termeFr')}
            placeholder="ex : sécurité aérienne"
            aria-invalid={!!errors.termeFr}
          />
          {errors.termeFr && (
            <p className="text-[11px] text-anac-danger">{errors.termeFr.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="termeEn">Terme anglais *</Label>
          <Input
            id="termeEn"
            {...register('termeEn')}
            placeholder="ex : aviation safety"
            aria-invalid={!!errors.termeEn}
          />
          {errors.termeEn && (
            <p className="text-[11px] text-anac-danger">{errors.termeEn.message}</p>
          )}
        </div>
      </div>

      {/* Domaine */}
      <div className="space-y-1.5">
        <Label htmlFor="domaine">
          Domaine
          <span className="text-anac-muted font-normal ml-1">(optionnel)</span>
        </Label>
        <Input
          id="domaine"
          {...register('domaine')}
          placeholder="ex : Réglementation, Navigation aérienne, Météorologie..."
        />
      </div>

      {/* Contexte */}
      <div className="space-y-1.5">
        <Label htmlFor="contexte">
          Contexte / Note
          <span className="text-anac-muted font-normal ml-1">(optionnel)</span>
        </Label>
        <textarea
          id="contexte"
          {...register('contexte')}
          rows={3}
          className="input resize-none text-sm"
          placeholder="Précisions d'utilisation, exemples, source..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={chargement} className="gap-2">
          {chargement ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function GlossairePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [domaine, setDomaine] = useState('');
  const [afficherInactifs, setAfficherInactifs] = useState(false);
  const [page, setPage] = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────
  const [modalTerme, setModalTerme] = useState<'creer' | 'modifier' | null>(null);
  const [termeSelectionne, setTermeSelectionne] = useState<Terme | null>(null);
  const [modalHistorique, setModalHistorique] = useState<Terme | null>(null);

  // ── Requête liste ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['glossaire', search, domaine, afficherInactifs, page],
    queryFn: async () => {
      const res = await glossaireApi.lister({
        search: search || undefined,
        domaine: domaine || undefined,
        actif: afficherInactifs ? undefined : true,
        page,
        pageSize: 20,
      });
      return res.data as { data: Terme[]; total: number; domaines: string[] };
    },
  });

  // ── Requête terme avec historique (pour modal historique) ─────────────
  const { data: termeDetail } = useQuery({
    queryKey: ['terme', modalHistorique?.id],
    queryFn: async () => {
      const res = await glossaireApi.getById(modalHistorique!.id);
      return res.data as Terme;
    },
    enabled: !!modalHistorique,
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const creerMutation = useMutation({
    mutationFn: (data: TermeFormData) => glossaireApi.creer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossaire'] });
      setModalTerme(null);
    },
  });

  const modifierMutation = useMutation({
    mutationFn: (data: TermeFormData) => glossaireApi.mettreAJour(termeSelectionne!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossaire'] });
      setModalTerme(null);
      setTermeSelectionne(null);
    },
  });

  const desactiverMutation = useMutation({
    mutationFn: (id: number) => glossaireApi.desactiver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossaire'] });
    },
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;
  const domaines = data?.domaines ?? [];

  function filtresActifs() {
    return search !== '' || domaine !== '' || afficherInactifs;
  }

  function reinitialiser() {
    setSearch('');
    setDomaine('');
    setAfficherInactifs(false);
    setPage(1);
  }

  function formaterDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Glossaire & Mémoire de traduction</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} terme{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            setTermeSelectionne(null);
            setModalTerme('creer');
          }}
          className="gap-2"
        >
          <Plus size={13} /> Nouveau terme
        </Button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Input
          type="text"
          placeholder="Rechercher FR ou EN..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />

        <Select
          value={domaine || '__all__'}
          onValueChange={(v) => {
            setDomaine(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les domaines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les domaines</SelectItem>
            {domaines.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle termes inactifs */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={afficherInactifs}
            onChange={(e) => {
              setAfficherInactifs(e.target.checked);
              setPage(1);
            }}
            className="rounded border-gray-300 text-anac-sky focus:ring-anac-sky"
          />
          <span className="text-sm text-anac-muted">Afficher les inactifs</span>
        </label>

        {filtresActifs() && (
          <Button variant="secondary" size="sm" onClick={reinitialiser}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-4 py-3">Français</th>
              <th className="text-left px-4 py-3">Anglais</th>
              <th className="text-left px-4 py-3">Domaine</th>
              <th className="text-left px-4 py-3">Contexte</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Modifié</th>
              <th className="text-left px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-anac-muted">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  {t('common.loading')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-anac-muted">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              data?.data.map((terme) => (
                <tr key={terme.id} className={`table-row ${!terme.actif ? 'opacity-50' : ''}`}>
                  {/* FR */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-anac-navy">{terme.termeFr}</span>
                  </td>

                  {/* EN */}
                  <td className="px-4 py-3">
                    <span className="text-anac-text">{terme.termeEn}</span>
                  </td>

                  {/* Domaine */}
                  <td className="px-4 py-3">
                    {terme.domaine ? (
                      <span className="text-[11px] bg-anac-navy/8 text-anac-navy rounded px-1.5 py-0.5">
                        {terme.domaine}
                      </span>
                    ) : (
                      <span className="text-anac-muted">—</span>
                    )}
                  </td>

                  {/* Contexte tronqué */}
                  <td className="px-4 py-3">
                    {terme.contexte ? (
                      <span
                        className="text-xs text-anac-muted truncate max-w-[180px] block"
                        title={terme.contexte}
                      >
                        {terme.contexte}
                      </span>
                    ) : (
                      <span className="text-anac-muted">—</span>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    {terme.actif ? (
                      <span className="badge-actif">Actif</span>
                    ) : (
                      <span className="badge-expire">Inactif</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-anac-muted text-xs">
                    {formaterDate(terme.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setTermeSelectionne(terme);
                          setModalTerme('modifier');
                        }}
                        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                      >
                        <Pencil size={11} className="mr-1" />
                        Modifier
                      </Button>

                      <span className="text-anac-border">·</span>

                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setModalHistorique(terme)}
                        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                      >
                        <History size={11} className="mr-1" />
                        Historique
                      </Button>

                      {terme.actif && (
                        <>
                          <span className="text-anac-border">·</span>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => desactiverMutation.mutate(terme.id)}
                            disabled={desactiverMutation.isPending}
                            className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                          >
                            <EyeOff size={11} className="mr-1" />
                            Désactiver
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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

      {/* ── Modal : Créer / Modifier terme ───────────────────────────── */}
      <Dialog
        open={!!modalTerme}
        onOpenChange={(open) => {
          if (!open) {
            setModalTerme(null);
            setTermeSelectionne(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {modalTerme === 'creer' ? 'Nouveau terme' : `Modifier — ${termeSelectionne?.termeFr}`}
            </DialogTitle>
            <DialogDescription>
              {modalTerme === 'creer'
                ? 'Ajoutez un nouveau terme au glossaire aéronautique ANAC.'
                : "Modifiez ce terme. L'ancienne valeur sera conservée dans l'historique."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FormulaireTerme
              key={termeSelectionne?.id ?? 'new'}
              initial={termeSelectionne ?? undefined}
              onSubmit={(data) => {
                if (modalTerme === 'creer') {
                  creerMutation.mutate(data);
                } else {
                  modifierMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setModalTerme(null);
                setTermeSelectionne(null);
              }}
              chargement={creerMutation.isPending || modifierMutation.isPending}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Historique ────────────────────────────────────────── */}
      <Dialog
        open={!!modalHistorique}
        onOpenChange={(open) => {
          if (!open) setModalHistorique(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique — {modalHistorique?.termeFr}</DialogTitle>
            <DialogDescription>Modifications successives de ce terme.</DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] overflow-y-auto">
            {!termeDetail?.historique || termeDetail.historique.length === 0 ? (
              <p className="text-sm text-anac-muted text-center py-8">
                Aucune modification enregistrée.
              </p>
            ) : (
              <div className="space-y-3">
                {termeDetail.historique.map((h) => (
                  <div key={h.id} className="border border-anac-border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-anac-navy">
                        {h.modifieParNom ?? 'Système'}
                      </span>
                      <span className="text-xs text-anac-muted">{formaterDate(h.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-[10px] text-anac-muted uppercase tracking-wide mb-0.5">
                          Ancien FR
                        </p>
                        <p className="text-sm text-anac-text">{h.ancienTermeFr ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-anac-muted uppercase tracking-wide mb-0.5">
                          Ancien EN
                        </p>
                        <p className="text-sm text-anac-text">{h.ancienTermeEn ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
