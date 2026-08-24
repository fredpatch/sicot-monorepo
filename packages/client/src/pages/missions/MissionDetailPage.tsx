import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bell, ClipboardCheck, FileText, History, Info, Loader2, Truck, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import HistoriqueNotifications from '@/pages/HistoriqueNotifications';
import { missionsApi } from '@/lib/missions.api';
import type { Mission } from './mission.types';
import { formatMissionDate } from './mission.utils';
import { MissionDetailHeader } from './components/MissionDetailHeader';
import { MissionSummaryStrip } from './components/MissionSummaryStrip';
import { MissionOverview } from './components/MissionOverview';
import { MissionParticipantsSection } from './components/MissionParticipantsSection';
import { MissionLogisticsSection } from './components/MissionLogisticsSection';
import { MissionReportSection } from './components/MissionReportSection';
import { MissionRecommendationsSection } from './components/MissionRecommendationsSection';

const SECTIONS = [
  { key: 'overview', label: 'Aperçu', icon: Info },
  { key: 'participants', label: 'Participants', icon: Users },
  { key: 'logistique', label: 'Logistique', icon: Truck },
  { key: 'rapport', label: 'Rapport', icon: FileText },
  { key: 'recommandations', label: 'Recommandations', icon: ClipboardCheck },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'historique', label: 'Historique', icon: History },
] as const;

export default function MissionDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const missionId = id ? parseInt(id, 10) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(searchParams.get('section') ?? 'overview');

  useEffect(() => {
    const next = searchParams.get('section');
    if (next) setSection(next);
  }, [searchParams]);

  function chooseSection(next: string) {
    setSection(next);
    const params = new URLSearchParams(searchParams);
    params.set('section', next);
    setSearchParams(params, { replace: true });
  }

  const missionQuery = useQuery({
    queryKey: ['mission', missionId],
    queryFn: async () => {
      const res = await missionsApi.getById(missionId!);
      return res.data as Mission;
    },
    enabled: Boolean(missionId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => missionsApi.mettreAJour(missionId!, { statut: 'annulee' as const }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
    },
  });

  if (!missionId) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Mission introuvable.</p>
        <Link to="/missions" className="mt-4 inline-block text-sm text-anac-blue hover:underline">
          Retour aux missions
        </Link>
      </div>
    );
  }

  if (missionQuery.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-anac-muted">
        <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (missionQuery.isError || !missionQuery.data) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Impossible de charger cette mission.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/missions')} className="mt-4">
          Retour aux missions
        </Button>
      </div>
    );
  }

  const mission = missionQuery.data;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <MissionDetailHeader
        mission={mission}
        onEdit={() => navigate(`/missions/${mission.id}/edit`)}
        onCancelMission={() => cancelMutation.mutate()}
      />

      <MissionSummaryStrip mission={mission} />

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav className="card h-fit p-3" aria-label="Sections de la mission">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseSection(key)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                section === key ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted hover:bg-anac-gray'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <main>
          {section === 'overview' && <MissionOverview mission={mission} />}
          {section === 'participants' && <MissionParticipantsSection mission={mission} />}
          {section === 'logistique' && <MissionLogisticsSection mission={mission} />}
          {section === 'rapport' && <MissionReportSection mission={mission} />}
          {section === 'recommandations' && <MissionRecommendationsSection mission={mission} />}

          {section === 'notifications' && (
            <section className="space-y-3">
              {(mission.recommandations ?? []).length === 0 ? (
                <div className="card p-5 text-sm text-anac-muted">
                  Aucune recommandation — aucun historique de relance pour cette mission.
                </div>
              ) : (
                (mission.recommandations ?? []).map((rec) => (
                  <div key={rec.id} className="card p-5">
                    <p className="text-sm font-semibold text-anac-navy">{rec.texte}</p>
                    <div className="mt-2">
                      <HistoriqueNotifications type="recommandation_rappel" entiteId={rec.id} />
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {section === 'historique' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Historique</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-anac-border pb-2">
                  <dt className="text-anac-muted">Créée le</dt>
                  <dd className="font-medium text-anac-navy">{formatMissionDate(mission.createdAt, 'long')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-anac-muted">Dernière modification</dt>
                  <dd className="font-medium text-anac-navy">{formatMissionDate(mission.updatedAt, 'long')}</dd>
                </div>
              </dl>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
