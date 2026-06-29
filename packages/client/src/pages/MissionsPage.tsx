import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { missionsApi, type MissionStatut } from '@/lib/missions.api';
import MissionDetail from './missions/components/MissionDetails';

// ── Types ──────────────────────────────────────────────────────────────────
interface ParticipantResume {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
}

interface Mission {
  id: number;
  titre: string;
  destination: string;
  pays: string;
  dateDebut: string;
  dateFin: string;
  statut: MissionStatut;
  participants: ParticipantResume[];
  rapportDocumentId?: number;
  createdAt: string;
}

// ── Badge statut ───────────────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: MissionStatut }) {
  const config: Record<MissionStatut, { label: string; classe: string }> = {
    planifiee: { label: 'Planifiée', classe: 'badge-info' },
    en_cours: { label: 'En cours', classe: 'badge-warning' },
    terminee: { label: 'Terminée', classe: 'badge-actif' },
    annulee: { label: 'Annulée', classe: 'badge-expire' },
  };
  const { label, classe } = config[statut] ?? { label: statut, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}

const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'annulee', label: 'Annulée' },
];

// ── Composant principal ────────────────────────────────────────────────────
export default function MissionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const missionIdSelectionne = id ? parseInt(id) : null;

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);

  // ── Requête liste ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['missions', search, statut, page],
    queryFn: async () => {
      const res = await missionsApi.lister({
        search: search || undefined,
        statut: statut ? (statut as MissionStatut) : undefined,
        page,
        pageSize: 30,
      });
      return res.data as { data: Mission[]; total: number };
    },
  });

  const totalPages = data ? Math.ceil(data.total / 30) : 0;

  function formaterDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden">
      {/* ── Colonne gauche ────────────────────────────────────────────── */}
      <div
        className={`
        flex flex-col border-r border-anac-border bg-white
        w-full md:w-80 lg:w-96 shrink-0
        ${missionIdSelectionne ? 'hidden md:flex' : 'flex'}
      `}
      >
        {/* En-tête */}
        <div className="p-4 border-b border-anac-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-anac-navy">Missions</h2>
            <Button
              size="sm"
              onClick={() => navigate('/missions/new')}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus size={12} /> Nouvelle
            </Button>
          </div>

          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-8 text-sm"
          />

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
              {FILTRES_STATUT.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || statut) && (
            <button
              onClick={() => {
                setSearch('');
                setStatut('');
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
            data?.data.map((mission) => {
              const estSelectionne = mission.id === missionIdSelectionne;

              return (
                <button
                  key={mission.id}
                  onClick={() => navigate(estSelectionne ? '/missions' : `/missions/${mission.id}`)}
                  className={`
                    w-full text-left px-4 py-3 transition-colors hover:bg-anac-gray/60
                    ${estSelectionne ? 'bg-anac-sky/8 border-l-2 border-anac-sky' : ''}
                  `}
                >
                  {/* Ligne 1 : statut + dates */}
                  <div className="flex items-center justify-between mb-1">
                    <BadgeStatut statut={mission.statut} />
                    <span className="text-[11px] text-anac-muted">
                      {formaterDate(mission.dateDebut)}
                    </span>
                  </div>

                  {/* Ligne 2 : titre */}
                  <div className="text-sm font-medium text-anac-navy truncate">{mission.titre}</div>

                  {/* Ligne 3 : destination + participants */}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-anac-muted truncate">
                      <MapPin size={10} className="shrink-0" />
                      {mission.destination}, {mission.pays}
                    </span>
                    {mission.participants.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-anac-muted shrink-0">
                        <Users size={10} />
                        {mission.participants.length}
                      </span>
                    )}
                  </div>

                  {/* Indicateur rapport manquant si mission terminée */}
                  {mission.statut === 'terminee' && !mission.rapportDocumentId && (
                    <div className="text-[11px] text-amber-600 font-medium mt-1">
                      ⚠ Rapport non déposé
                    </div>
                  )}
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
      <div
        className={`
        flex-1 overflow-hidden
        ${missionIdSelectionne ? 'flex' : 'hidden md:flex'}
      `}
      >
        {missionIdSelectionne ? (
          <MissionDetail
            missionId={missionIdSelectionne}
            onRetour={() => navigate('/missions')}
            onModifier={() => navigate(`/missions/${missionIdSelectionne}/edit`)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-anac-muted gap-3">
            <div className="w-12 h-12 rounded-full bg-anac-gray flex items-center justify-center">
              <Calendar size={20} className="text-anac-muted" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-anac-navy">Sélectionnez une mission</p>
              <p className="text-xs mt-0.5">Cliquez sur une mission pour voir les détails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
