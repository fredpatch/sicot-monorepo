import { AlertCircle, Clock3, FileText, PauseCircle, RefreshCw } from 'lucide-react';

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

export function AccordSummaryCards({
  total,
  actifs,
  renouveler,
  expires,
  suspendus,
}: {
  total?: number;
  actifs?: number;
  renouveler?: number;
  expires?: number;
  suspendus?: number;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        label="Total accords"
        value={total}
        helper="Tous statuts confondus"
        icon={<FileText size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="Actifs"
        value={actifs}
        helper="En cours de validité"
        icon={<Clock3 size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="À renouveler"
        value={renouveler}
        helper="Dans les 90 prochains jours"
        icon={<RefreshCw size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="Expirés"
        value={expires}
        helper="Nécessitent une action"
        icon={<AlertCircle size={16} aria-hidden="true" />}
        tone="red"
      />
      <SummaryCard
        label="Suspendus"
        value={suspendus}
        helper="Temporairement inactifs"
        icon={<PauseCircle size={16} aria-hidden="true" />}
        tone="slate"
      />
    </section>
  );
}

