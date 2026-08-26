// packages/client/src/pages/demandes/components/RequestsSummaryCards.tsx
import { Archive, CheckCircle2, ClipboardList, Clock, Eye } from 'lucide-react';
import type { DemandesAggregates } from '@/lib/demandes.api';

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

export function RequestsSummaryCards({ aggregates }: { aggregates?: DemandesAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard
        label="Total demandes"
        value={aggregates?.total}
        helper="Toutes demandes"
        icon={<ClipboardList size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="À assigner"
        value={aggregates?.aAssigner}
        helper="En attente de prise en charge"
        icon={<Clock size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="En cours"
        value={aggregates?.enCours}
        helper="Assignées et en traitement"
        icon={<ClipboardList size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="En relecture"
        value={aggregates?.enRelecture}
        helper="En attente de révision"
        icon={<Eye size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="Validées"
        value={aggregates?.validees}
        helper="Prêtes à archiver"
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="Archivées"
        value={aggregates?.archivees}
        helper="Historique"
        icon={<Archive size={16} aria-hidden="true" />}
        tone="slate"
      />
    </section>
  );
}
