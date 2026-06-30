import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { accordsApi, type AccordStatut } from '@/lib/accords.api';
import AccordDetail from './accords/components/AccordDetail';
import { organisationsApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
  type: string;
}

interface Accord {
  id: number;
  reference: string;
  titre: string;
  statut: AccordStatut;
  dateSignature: string;
  dateExpiration?: string;
  partenaires: OrganisationResume[];
  parentId?: number;
  createdAt: string;
}

// ── Badge statut ───────────────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: AccordStatut }) {
  const config: Record<AccordStatut, { label: string; classe: string }> = {
    actif: { label: 'Actif', classe: 'badge-actif' },
    expire: { label: 'Expiré', classe: 'badge-expire' },
    suspendu: { label: 'Suspendu', classe: 'badge-warning' },
    en_renouvellement: { label: 'En renouvellement', classe: 'badge-info' },
  };
  const { label, classe } = config[statut] ?? { label: statut, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}

const STATUTS: { value: string; label: string }[] = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'actif', label: 'Actif' },
  { value: 'expire', label: 'Expiré' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'en_renouvellement', label: 'En renouvellement' },
];

// ── Composant principal ────────────────────────────────────────────────────
export default function AccordsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const accordIdSelectionne = id ? parseInt(id) : null;

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [partenaireId, setPartenaireId] = useState<number | undefined>(() => {
    const param = searchParams.get('partenaireId');
    return param ? parseInt(param) : undefined;
  });
  const [page, setPage] = useState(1);

  // ── Requête ───────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['accords', search, statut, partenaireId, page],
    queryFn: async () => {
      const res = await accordsApi.lister({
        search: search || undefined,
        statut: statut ? (statut as AccordStatut) : undefined,
        partenairesId: partenaireId,
        page,
        pageSize: 20,
      });
      return res.data as { data: Accord[]; total: number };
    },
  });
  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const { data: orgsData } = useQuery({
    queryKey: ['organisations-filtre-accords'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: { id: number; nom: string; pays: string }[] };
    },
  });

  const organisations = orgsData?.data ?? [];

  useEffect(() => {
    const param = searchParams.get('partenaireId');
    setPartenaireId(param ? parseInt(param) : undefined);
  }, [searchParams]);

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden">
      {/* ── Colonne gauche ────────────────────────────────────────────── */}
      <div
        className={`
        flex flex-col border-r border-anac-border bg-white
        w-full md:w-80 lg:w-96 shrink-0
        ${accordIdSelectionne ? 'hidden md:flex' : 'flex'}
      `}
      >
        {/* En-tête */}
        <div className="p-4 border-b border-anac-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-anac-navy">Accords</h2>
            <Button
              size="sm"
              onClick={() => navigate('/accords/new')}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus size={12} /> Nouveau
            </Button>
          </div>

          {partenaireId && (
            <div className="flex items-center gap-2 bg-anac-sky/8 border border-anac-sky/20 rounded-lg px-3 py-2 text-xs text-anac-navy">
              <span>
                Filtré sur :{' '}
                <strong>
                  {organisations.find((o) => o.id === partenaireId)?.nom ??
                    `Partenaire #${partenaireId}`}
                </strong>
              </span>
              <button
                onClick={() => {
                  setPartenaireId(undefined);
                  navigate('/accords');
                }}
                className="ml-auto text-anac-sky hover:text-anac-navy"
              >
                ✕
              </button>
            </div>
          )}

          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-8 text-sm"
          />

          <div className="flex items-center gap-2">
            <Select
              value={statut || '__all__'}
              onValueChange={(v) => {
                setStatut(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={partenaireId?.toString() ?? '__all__'}
              onValueChange={(v) => {
                setPartenaireId(v === '__all__' ? undefined : parseInt(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrer par partenaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les partenaires</SelectItem>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.nom} <span className="text-anac-muted">· {org.pays}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(search || statut || partenaireId) && (
            <button
              onClick={() => {
                setSearch('');
                setStatut('');
                setPartenaireId(undefined);
                setPage(1);
              }}
              className="text-xs text-anac-sky hover:text-anac-navy transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto divide-y divide-anac-border/60">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-anac-muted">
              <Loader2 size={16} className="animate-spin mr-2" />
              {t('common.loading')}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="text-center py-16 text-anac-muted text-sm">{t('common.noData')}</div>
          ) : (
            data?.data.map((accord) => {
              const estSelectionne = accord.id === accordIdSelectionne;
              const estExpire =
                accord.dateExpiration && new Date(accord.dateExpiration) < new Date();
              const expireProche =
                accord.dateExpiration &&
                accord.statut === 'actif' &&
                new Date(accord.dateExpiration) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

              return (
                <button
                  key={accord.id}
                  onClick={() => navigate(estSelectionne ? '/accords' : `/accords/${accord.id}`)}
                  className={`
                    w-full text-left px-4 py-3 transition-colors hover:bg-anac-gray/60
                    ${estSelectionne ? 'bg-anac-sky/8 border-l-2 border-anac-sky' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-anac-sky">{accord.reference}</span>
                    <BadgeStatut statut={accord.statut} />
                  </div>
                  <div className="text-sm font-medium text-anac-navy truncate">{accord.titre}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-anac-muted truncate max-w-[60%]">
                      {accord.partenaires.map((p) => p.nom).join(', ') || '—'}
                    </span>
                    {accord.dateExpiration && (
                      <span
                        className={`text-[11px] ${estExpire ? 'text-red-600 font-medium' : expireProche ? 'text-amber-600' : 'text-anac-muted'}`}
                      >
                        {new Date(accord.dateExpiration).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-anac-border flex items-center justify-between">
            <span className="text-xs text-anac-muted">
              {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft size={13} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Colonne droite — détail ───────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto ${accordIdSelectionne ? 'flex' : 'hidden md:flex'}`}>
        {accordIdSelectionne ? (
          <AccordDetail
            accordId={accordIdSelectionne}
            onModifier={() => navigate(`/accords/${accordIdSelectionne}/edit`)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-anac-muted gap-3">
            <div className="w-12 h-12 rounded-full bg-anac-gray flex items-center justify-center">
              <FileText size={20} className="text-anac-muted" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-anac-navy">Sélectionnez un accord</p>
              <p className="text-xs mt-0.5">Cliquez sur un accord pour voir les détails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
