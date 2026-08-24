import { AlertTriangle, ClipboardList, Inbox, Send, Clock } from 'lucide-react';
import type { CourriersAggregates } from '../courrier.types';

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

export function CourriersSummaryCards({ aggregates }: { aggregates?: CourriersAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        label="Total courriers"
        value={aggregates?.total}
        helper="Tous types confondus"
        icon={<ClipboardList size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="À traiter"
        value={aggregates?.aTraiter}
        helper="Courriers entrants non traités"
        icon={<Inbox size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="En attente de réponse"
        value={aggregates?.enAttenteReponse}
        helper={
          aggregates?.enDepassement ? `${aggregates.enDepassement} en dépassement` : 'Réponse requise'
        }
        icon={<Clock size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="Envoyés"
        value={aggregates?.envoyes}
        helper="Courriers sortants transmis"
        icon={<Send size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="En dépassement"
        value={aggregates?.enDepassement}
        helper="À traiter en priorité"
        icon={<AlertTriangle size={16} aria-hidden="true" />}
        tone="red"
      />
    </section>
  );
}
