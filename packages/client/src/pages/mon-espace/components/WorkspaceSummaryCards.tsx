// packages/client/src/pages/mon-espace/components/WorkspaceSummaryCards.tsx
import { ClipboardList, Clock, Plane, FileWarning } from 'lucide-react';
import type { DemandesAggregates } from '@/lib/demandes.api';
import type { MissionsAggregates } from '@/pages/missions/mission.types';

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value?: number;
  helper: string;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-anac-blue border-blue-100',
    green: 'bg-green-50 text-anac-success border-green-100',
    amber: 'bg-amber-50 text-anac-warning border-amber-100',
    red: 'bg-red-50 text-anac-danger border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }[tone];

  return (
    <div className="card flex min-h-[92px] items-start justify-between p-4">
      <div>
        <p className="text-xs font-medium text-anac-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-anac-navy">
          {value === undefined ? '-' : value}
        </p>
        <p className="mt-1 text-xs text-anac-muted">{helper}</p>
      </div>
      <span className={`rounded-md border p-2 ${toneClasses}`}>{icon}</span>
    </div>
  );
}

export function WorkspaceSummaryCards({
  demandes,
  missions,
}: {
  demandes?: DemandesAggregates;
  missions?: MissionsAggregates;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Mes demandes"
        value={demandes?.total}
        helper="Toutes vos demandes"
        icon={<ClipboardList size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="Demandes en cours"
        value={demandes?.enCours}
        helper="En cours de traitement"
        icon={<Clock size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="Mes missions"
        value={missions?.total}
        helper="Missions auxquelles vous participez"
        icon={<Plane size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="Rapports en attente"
        value={missions?.rapportsEnAttente}
        helper="Missions terminées sans rapport déposé"
        icon={<FileWarning size={16} aria-hidden="true" />}
        tone={missions?.rapportsEnAttente ? 'red' : 'green'}
      />
    </section>
  );
}
