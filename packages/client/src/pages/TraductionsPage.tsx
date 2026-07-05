/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Languages,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { confirmToast } from '@/lib/confirm-toast';
import {
  traductionsApi,
  type TraductionStatut,
  type TraductionDirection,
} from '@/lib/traductions.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface Traduction {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: TraductionDirection;
  statut: TraductionStatut;
  moteurUtilise: string;
  traducteurId?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Badges ─────────────────────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: TraductionStatut }) {
  const config: Record<
    TraductionStatut,
    { label: string; classe: string; icone: React.ReactNode }
  > = {
    a_reviser: { label: 'À réviser', classe: 'badge-warning', icone: <Clock size={10} /> },
    en_relecture: { label: 'En relecture', classe: 'badge-info', icone: <Clock size={10} /> },
    approuvee: { label: 'Approuvée', classe: 'badge-actif', icone: <CheckCircle2 size={10} /> },
    archivee: { label: 'Archivée', classe: 'badge-expire', icone: <Archive size={10} /> },
    manuelle_requise: {
      label: 'Manuelle requise',
      classe: 'badge-expire',
      icone: <AlertCircle size={10} />,
    },
  };
  const { label, classe, icone } = config[statut];
  return (
    <span className={`${classe} inline-flex items-center gap-1`}>
      {icone} {label}
    </span>
  );
}

function BadgeDirection({ direction }: { direction: TraductionDirection }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-anac-muted bg-anac-gray rounded px-1.5 py-0.5">
      <Languages size={10} />
      {direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
    </span>
  );
}

const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'a_reviser', label: 'À réviser' },
  { value: 'en_relecture', label: 'En relecture' },
  { value: 'approuvee', label: 'Approuvée' },
  { value: 'archivee', label: 'Archivée' },
  { value: 'manuelle_requise', label: 'Manuelle requise' },
];

const FILTRES_DIRECTION = [
  { value: '__all__', label: 'Toutes directions' },
  { value: 'fr_en', label: 'FR → EN' },
  { value: 'en_fr', label: 'EN → FR' },
];

// ── Composant principal ────────────────────────────────────────────────────
export default function TraductionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [statut, setStatut] = useState('');
  const [direction, setDirection] = useState('');
  const [page, setPage] = useState(1);

  // ── Modal nouvelle traduction ─────────────────────────────────────────
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [texteLibre, setTexteLibre] = useState('');
  const [directionForm, setDirectionForm] = useState<TraductionDirection>('fr_en');
  const [lancement, setLancement] = useState(false);
  const [erreurLancement, setErreurLancement] = useState<string | null>(null);

  // ── Requête liste ─────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['traductions', statut, direction, page],
    queryFn: async () => {
      const res = await traductionsApi.lister({
        statut: statut ? (statut as TraductionStatut) : undefined,
        direction: direction ? (direction as TraductionDirection) : undefined,
        page,
        pageSize: 20,
      });
      return res.data as { data: Traduction[]; total: number };
    },
  });

  // ── Statut moteur ─────────────────────────────────────────────────────
  const { data: moteur } = useQuery({
    queryKey: ['traduction-moteur'],
    queryFn: async () => {
      const res = await traductionsApi.moteurStatus();
      return res.data as { accessible: boolean; langues: string[] };
    },
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  function formaterDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  function apercu(texte?: string) {
    if (!texte) return '-';
    return texte.length > 80 ? texte.slice(0, 80) + '...' : texte;
  }

  // ──────────────────────────────────────────────────────────────
  const supprimerMutation = useMutation({
    mutationFn: (id: number) => traductionsApi.supprimer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['traductions'] }),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la suppression.';
      toast.error(msg);
    },
  });

  // ── Lancer traduction texte libre ─────────────────────────────────────
  async function lancerTraduction() {
    if (!texteLibre.trim()) return;

    setLancement(true);
    setErreurLancement(null);

    try {
      const res = await traductionsApi.lancer({
        texteOriginal: texteLibre,
        direction: directionForm,
      });

      setModalNouvelle(false);
      setTexteLibre('');
      refetch();
      navigate(`/traductions/${res.data.id}`);
    } catch (err: unknown) {
      console.error('[traduction] Erreur lancement:', err);

      const axiosErr = err as {
        code?: string;
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      // Timeout axios
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        setErreurLancement(
          'La traduction prend plus de temps que prévu. Vérifiez dans la liste - elle est peut-être déjà en cours.'
        );
        // Rafraîchir la liste au cas où la traduction a quand même été créée
        refetch();
        return;
      }

      // Erreur serveur avec message
      if (axiosErr.response?.data?.message) {
        setErreurLancement(axiosErr.response.data.message);
        return;
      }

      // Erreur réseau générique
      if (axiosErr.code === 'ERR_NETWORK') {
        setErreurLancement('Erreur réseau - vérifiez que le serveur est démarré.');
        return;
      }

      setErreurLancement(`Erreur inattendue : ${axiosErr.message ?? 'inconnue'}`);
    } finally {
      setLancement(false);
    }
  }

  // Dans le useEffect au montage :
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('traduction_prefill');
      if (prefill) {
        const { documentId, texte } = JSON.parse(prefill);
        setTexteLibre(texte);
        setModalNouvelle(true);
        // Nettoyer après lecture — one-shot
        sessionStorage.removeItem('traduction_prefill');
      }
    } catch {
      // Ignorer les erreurs de parsing
      sessionStorage.removeItem('traduction_prefill');
    }
  }, []);

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Traduction IA</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} traduction{(data?.total ?? 0) > 1 ? 's' : ''}
            {moteur && (
              <span
                className={`ml-3 text-xs font-medium ${moteur.accessible ? 'text-green-600' : 'text-red-500'}`}
              >
                · LibreTranslate {moteur.accessible ? '✓ Opérationnel' : '✕ Hors ligne'}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setModalNouvelle(true)} className="gap-2">
          <Plus size={13} /> Nouvelle traduction
        </Button>
      </div>

      {/* ── Alerte moteur hors ligne ──────────────────────────────────── */}
      {moteur && !moteur.accessible && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          LibreTranslate est inaccessible. Les nouvelles traductions seront marquées &quot;Manuelle
          requise&quot;.
        </div>
      )}

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
          value={direction || '__all__'}
          onValueChange={(v) => {
            setDirection(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTRES_DIRECTION.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statut || direction) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStatut('');
              setDirection('');
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
              <th className="text-left px-4 py-3">Texte original</th>
              <th className="text-left px-4 py-3">Direction</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Moteur</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-anac-muted">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  {t('common.loading')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-anac-muted">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              data?.data.map((trad) => (
                <tr key={trad.id} className="table-row">
                  <td className="px-4 py-3">
                    <p className="text-anac-navy text-sm truncate max-w-xs">
                      {apercu(trad.texteOriginal)}
                    </p>
                    {trad.documentId && (
                      <p className="text-xs text-anac-muted mt-0.5">Document #{trad.documentId}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <BadgeDirection direction={trad.direction} />
                  </td>

                  <td className="px-4 py-3">
                    <BadgeStatut statut={trad.statut} />
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs text-anac-muted capitalize">{trad.moteurUtilise}</span>
                  </td>

                  <td className="px-4 py-3 text-anac-muted text-xs">
                    {formaterDate(trad.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate(`/traductions/${trad.id}`)}
                        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                      >
                        {trad.statut === 'a_reviser' || trad.statut === 'en_relecture'
                          ? 'Réviser'
                          : 'Consulter'}
                      </Button>

                      {/* Supprimer — uniquement si pas approuvée ou archivée */}
                      {trad.statut !== 'approuvee' && trad.statut !== 'archivee' && (
                        <>
                          <span className="text-anac-border">·</span>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              confirmToast('Supprimer cette traduction ?', () =>
                                supprimerMutation.mutate(trad.id)
                              );
                            }}
                            disabled={supprimerMutation.isPending}
                            className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                          >
                            Supprimer
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

      {/* ── Modal : Nouvelle traduction ───────────────────────────────── */}
      <Dialog
        open={modalNouvelle}
        onOpenChange={(open) => {
          if (!open) {
            setModalNouvelle(false);
            setTexteLibre('');
            setErreurLancement(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle traduction</DialogTitle>
            <DialogDescription>
              Saisissez le texte à traduire. La traduction IA sera lancée immédiatement et vous
              pourrez la réviser dans l&apos;éditeur.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Direction */}
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={directionForm}
                onValueChange={(v) => setDirectionForm(v as TraductionDirection)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr_en">Français → Anglais</SelectItem>
                  <SelectItem value="en_fr">Anglais → Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Texte */}
            <div className="space-y-1.5">
              <Label htmlFor="texte-libre">
                Texte à traduire *
                <span className="text-anac-muted font-normal ml-2 text-xs">
                  ({texteLibre.length} caractères)
                </span>
              </Label>
              <textarea
                id="texte-libre"
                value={texteLibre}
                onChange={(e) => setTexteLibre(e.target.value)}
                rows={10}
                className="input resize-none text-sm font-mono"
                placeholder={
                  directionForm === 'fr_en'
                    ? 'Saisissez le texte en français...'
                    : 'Enter text in English...'
                }
              />
            </div>

            {erreurLancement && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {erreurLancement}
              </div>
            )}

            {/* Avertissement moteur hors ligne */}
            {moteur && !moteur.accessible && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-xs">
                ⚠ LibreTranslate est hors ligne. La traduction sera créée avec statut &quot;Manuelle
                requise&quot; - vous pourrez saisir la traduction manuellement.
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setModalNouvelle(false);
                setTexteLibre('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={lancerTraduction}
              disabled={!texteLibre.trim() || lancement}
              className="gap-2"
            >
              {lancement ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Traduction en cours...
                </>
              ) : (
                <>
                  <Languages size={13} /> Lancer la traduction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
