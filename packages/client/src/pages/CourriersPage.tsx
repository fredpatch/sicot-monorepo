import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
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
  courriersApi,
  type CourrierDirection,
  type CourrierSuiviStatut,
} from '@/lib/courriers.api';
import CourrierDetail from './courriers/components/CourrierDetail';

// ── Types ──────────────────────────────────────────────────────────────────
interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
}

type CourrierCriticite = 'normal' | 'a_surveiller' | 'critique';

interface Courrier {
  id: number;
  reference: string;
  direction: CourrierDirection;
  objet: string;
  expediteur?: OrganisationResume;
  destinataire?: OrganisationResume;
  dateReception: string;
  reponseRequise: 'oui' | 'non' | 'pour_information';
  dateLimiteReponse?: string;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  createdAt: string;

  criticite?: CourrierCriticite;
  joursAttente?: number;
}

// ── Badges ─────────────────────────────────────────────────────────────────
function BadgeDirection({ direction }: { direction: CourrierDirection }) {
  if (direction === 'entrant') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
        <ArrowDownLeft size={10} /> Entrant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 rounded px-1.5 py-0.5">
      <ArrowUpRight size={10} /> Sortant
    </span>
  );
}

function BadgeSuivi({
  statut,
  reponseRequise,
  criticite,
}: {
  statut: CourrierSuiviStatut;
  reponseRequise: string;
  criticite?: CourrierCriticite;
}) {
  if (statut === 'archive') {
    return <span className="badge-expire">Archivé</span>;
  }
  if (statut === 'repondu') {
    return <span className="badge-actif">Répondu</span>;
  }

  // en_attente — utiliser la criticité si calculée
  if (criticite === 'critique') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-red-600 rounded px-1.5 py-0.5">
        <AlertCircle size={10} /> Critique
      </span>
    );
  }
  if (criticite === 'a_surveiller') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
        <AlertCircle size={10} /> À surveiller
      </span>
    );
  }
  if (reponseRequise === 'oui') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 rounded px-1.5 py-0.5">
        <AlertCircle size={10} /> En attente
      </span>
    );
  }
  return <span className="badge-info">En attente</span>;
}

const FILTRES_DIRECTION = [
  { value: '__all__', label: 'Tous' },
  { value: 'entrant', label: 'Entrants' },
  { value: 'sortant', label: 'Sortants' },
];

const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'repondu', label: 'Répondu' },
  { value: 'archive', label: 'Archivé' },
];

// ── Composant principal ────────────────────────────────────────────────────
export default function CourriersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const courrierIdSelectionne = id ? parseInt(id) : null;

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);

  // ── Requête liste ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['courriers', search, direction, statut, page],
    queryFn: async () => {
      const res = await courriersApi.lister({
        search: search || undefined,
        direction: direction ? (direction as CourrierDirection) : undefined,
        suiviStatut: statut ? (statut as CourrierSuiviStatut) : undefined,
        page,
        pageSize: 30,
      });
      return res.data as { data: Courrier[]; total: number };
    },
  });

  const totalPages = data ? Math.ceil(data.total / 30) : 0;

  function filtresActifs() {
    return search !== '' || direction !== '' || statut !== '';
  }

  function reinitialiser() {
    setSearch('');
    setDirection('');
    setStatut('');
    setPage(1);
  }

  function selectionner(courrierId: number) {
    if (courrierId === courrierIdSelectionne) {
      navigate('/courriers');
    } else {
      navigate(`/courriers/${courrierId}`);
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden">
      {/* ── Colonne gauche — liste ────────────────────────────────────
          Masquée sur mobile quand un courrier est sélectionné        */}
      <div
        className={`
          flex flex-col border-r border-anac-border bg-white
          w-full md:w-80 lg:w-96 shrink-0
          ${courrierIdSelectionne ? 'hidden md:flex' : 'flex'}
        `}
      >
        {/* En-tête colonne gauche */}
        <div className="p-4 border-b border-anac-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-anac-navy">Correspondances</h2>
            <Button
              size="sm"
              onClick={() => navigate('/courriers/new')}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus size={12} /> Nouveau
            </Button>
          </div>

          {/* Filtres compacts */}
          <Input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-8 text-sm"
          />

          <div className="flex gap-2">
            <Select
              value={direction || '__all__'}
              onValueChange={(v) => {
                setDirection(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
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

            <Select
              value={statut || '__all__'}
              onValueChange={(v) => {
                setStatut(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
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
          </div>

          {filtresActifs() && (
            <button
              onClick={reinitialiser}
              className="text-xs text-anac-sky hover:text-anac-navy transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Liste courriers */}
        <div className="flex-1 overflow-y-auto divide-y divide-anac-border/60">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-anac-muted">
              <Loader2 size={16} className="animate-spin mr-2" />
              {t('common.loading')}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="text-center py-16 text-anac-muted text-sm">{t('common.noData')}</div>
          ) : (
            data?.data.map((courrier) => {
              const estSelectionne = courrier.id === courrierIdSelectionne;
              const interlocuteur =
                courrier.direction === 'entrant' ? courrier.expediteur : courrier.destinataire;
              const enAttenteUrgent =
                courrier.suiviStatut === 'en_attente' &&
                courrier.reponseRequise === 'oui' &&
                courrier.direction === 'entrant';

              return (
                <button
                  key={courrier.id}
                  onClick={() => selectionner(courrier.id)}
                  className={`
                    w-full text-left px-4 py-3 transition-colors
                    hover:bg-anac-gray/60
                    ${estSelectionne ? 'bg-anac-sky/8 border-l-2 border-anac-sky' : ''}
                  `}
                >
                  {/* Ligne 1 : direction + date */}
                  <div className="flex items-center justify-between mb-1">
                    <BadgeDirection direction={courrier.direction} />
                    <span className="text-[11px] text-anac-muted">
                      {new Date(courrier.dateReception).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {/* Ligne 2 : objet */}
                  <div
                    className={`text-sm truncate ${enAttenteUrgent ? 'font-semibold text-anac-navy' : 'font-medium text-anac-text'}`}
                  >
                    {courrier.objet}
                  </div>

                  {/* Ligne 3 : interlocuteur + statut */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-anac-muted truncate max-w-[55%]">
                      {interlocuteur?.nom ?? '—'}
                    </span>
                    <BadgeSuivi
                      statut={courrier.suiviStatut}
                      reponseRequise={courrier.reponseRequise}
                      criticite={courrier.criticite}
                    />
                  </div>

                  {/* Indicateur date limite dépassée */}
                  {courrier.criticite &&
                    courrier.criticite !== 'normal' &&
                    courrier.joursAttente !== undefined && (
                      <div
                        className={`text-[11px] font-medium mt-1 ${
                          courrier.criticite === 'critique' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      >
                        {courrier.criticite === 'critique' ? '⚠⚠' : '⚠'} En attente depuis{' '}
                        {courrier.joursAttente} jours
                      </div>
                    )}
                </button>
              );
            })
          )}
        </div>

        {/* Pagination compacte */}
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
      <div
        className={`
        flex-1 overflow-hidden
        ${courrierIdSelectionne ? 'flex' : 'hidden md:flex'}
      `}
      >
        {courrierIdSelectionne ? (
          <CourrierDetail
            courrierId={courrierIdSelectionne}
            onRetour={() => navigate('/courriers')}
            onModifier={() => navigate(`/courriers/${courrierIdSelectionne}/edit`)}
            onRepondre={() => navigate(`/courriers/new?reponseAId=${courrierIdSelectionne}`)}
          />
        ) : (
          /* État vide — aucun courrier sélectionné */
          <div className="flex-1 flex flex-col items-center justify-center text-anac-muted gap-3">
            <div className="w-12 h-12 rounded-full bg-anac-gray flex items-center justify-center">
              <ArrowDownLeft size={20} className="text-anac-muted" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-anac-navy">Sélectionnez un courrier</p>
              <p className="text-xs mt-0.5">Cliquez sur un courrier pour voir les détails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
