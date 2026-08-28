import { Link } from 'react-router-dom';
import { FileWarning, Truck, Users } from 'lucide-react';

import type { Mission } from '../mission.types';
import {
  countOverdueRecommendations,
  countPendingRecommendations,
  formatMissionDate,
  isMissionReportMissing,
} from '../mission.utils';
import { MissionLogisticsBadge } from './MissionLogisticsBadge';
import { MissionPeriod } from './MissionPeriod';

// The three real columns from the Phase 2 plan §4 - Informations clés /
// Participants preview / Operational follow-up - answering "what still
// needs attention?" with real fields, in place of the mockup's invented
// Programme column.
export function MissionOverview({ mission }: { mission: Mission }) {
  const recommandations = mission.recommandations ?? [];
  const overdue = countOverdueRecommendations(recommandations);
  const pending = countPendingRecommendations(recommandations);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Informations clés</h3>
        <dl className="mt-4 grid gap-4 text-sm">
          <DetailRow label="Titre" value={mission.titre} />
          <DetailRow label="Destination" value={`${mission.destination}, ${mission.pays}`} />
          <DetailRow
            label="Dates"
            value={<MissionPeriod dateDebut={mission.dateDebut} dateFin={mission.dateFin} />}
          />
          <DetailRow label="Créée le" value={formatMissionDate(mission.createdAt, 'long')} />
        </dl>
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Participants</h3>
        {mission.participants.length === 0 ? (
          <p className="mt-4 text-sm text-anac-muted">Aucun participant.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {mission.participants.slice(0, 4).map((participant) => (
              <li key={participant.id} className="flex items-center gap-2 text-sm">
                <Users size={13} className="shrink-0 text-anac-muted" aria-hidden="true" />
                <span className="truncate text-anac-navy">
                  {participant.prenom} {participant.nom}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to={`/missions/${mission.id}?section=participants`}
          className="mt-4 inline-block text-sm text-anac-blue hover:underline"
        >
          Voir tous les participants ({mission.participants.length})
        </Link>
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Suivi opérationnel</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-anac-muted">
              <Truck size={13} aria-hidden="true" />
              Logistique
            </dt>
            <dd>
              <MissionLogisticsBadge statut={mission.confirmationLogistique} />
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-anac-muted">
              <FileWarning size={13} aria-hidden="true" />
              Rapport
            </dt>
            <dd className="font-medium text-anac-navy">
              {mission.rapportDocumentId
                ? 'Disponible'
                : isMissionReportMissing(mission)
                  ? 'À déposer'
                  : 'Non requis'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-anac-muted">Recommandations</dt>
            <dd className="text-right font-medium text-anac-navy">
              {pending} en attente
              {overdue > 0 && (
                <span className="block text-xs text-anac-danger">
                  {overdue} dépassée{overdue > 1 ? 's' : ''}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
      <dt className="text-xs font-medium text-anac-muted">{label}</dt>
      <dd className="text-anac-navy">{value}</dd>
    </div>
  );
}
