import { CountryMark } from '@/pages/partenaires/components/CountryMark';
import type { Mission } from '../mission.types';
import { MissionLogisticsBadge } from './MissionLogisticsBadge';
import { MissionPeriod } from './MissionPeriod';
import { MissionStatusBadge } from './MissionStatusBadge';

export function MissionSummaryStrip({ mission }: { mission: Mission }) {
  return (
    <section className="grid grid-cols-2 gap-3 rounded-lg border border-anac-border bg-white p-4 md:grid-cols-5">
      <SummaryItem label="Statut" value={<MissionStatusBadge statut={mission.statut} />} />
      <SummaryItem
        label="Destination"
        value={
          <span className="inline-flex items-center gap-1.5">
            <CountryMark country={mission.pays} />
            {mission.destination}, {mission.pays}
          </span>
        }
      />
      <SummaryItem label="Période" value={<MissionPeriod dateDebut={mission.dateDebut} dateFin={mission.dateFin} />} />
      <SummaryItem label="Participants" value={mission.participants.length} />
      <SummaryItem label="Logistique" value={<MissionLogisticsBadge statut={mission.confirmationLogistique} />} />
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-r border-anac-border pr-3 last:border-r-0">
      <p className="text-xs text-anac-muted">{label}</p>
      <div className="mt-1 font-semibold text-anac-navy">{value}</div>
    </div>
  );
}
