import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, PlaneTakeoff, XCircle } from 'lucide-react';
import type { MissionsAggregates } from '../mission.types';

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

export function MissionsSummaryCards({ aggregates }: { aggregates?: MissionsAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <SummaryCard
        label="Total missions"
        value={aggregates?.total}
        helper="Toutes périodes"
        icon={<ClipboardList size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="Planifiées"
        value={aggregates?.planifiees}
        helper="À préparer"
        icon={<CalendarClock size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="En cours"
        value={aggregates?.enCours}
        helper="Actuellement en déplacement"
        icon={<PlaneTakeoff size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="À venir"
        value={aggregates?.aVenir30Jours}
        helper="Dans les 30 prochains jours"
        icon={<CalendarClock size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="Terminées"
        value={aggregates?.terminees}
        helper="Suivi terminé"
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="Annulées"
        value={aggregates?.annulees}
        helper={aggregates?.annulees === 0 ? 'Aucune annulation' : 'À vérifier'}
        icon={<XCircle size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="Logistique à risque"
        value={aggregates?.logistiqueARisque}
        helper="Départ proche, logistique non confirmée"
        icon={<AlertTriangle size={16} aria-hidden="true" />}
        tone="red"
      />
    </section>
  );
}
