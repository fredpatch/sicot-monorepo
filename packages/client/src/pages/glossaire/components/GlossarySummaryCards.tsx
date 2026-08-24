import { BookOpen, CheckCircle2, Layers, XCircle } from 'lucide-react';
import type { GlossaireAggregates } from '../glossary.types';

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
  tone: 'blue' | 'green' | 'red' | 'slate';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-anac-blue border-blue-100',
    green: 'bg-green-50 text-anac-success border-green-100',
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

export function GlossarySummaryCards({ aggregates }: { aggregates?: GlossaireAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Total termes"
        value={aggregates?.total}
        helper="Tous domaines confondus"
        icon={<BookOpen size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="Actifs"
        value={aggregates?.actifs}
        helper="Disponibles dans les traductions"
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="Inactifs"
        value={aggregates?.inactifs}
        helper="Termes désactivés"
        icon={<XCircle size={16} aria-hidden="true" />}
        tone="red"
      />
      <SummaryCard
        label="Domaines"
        value={aggregates?.domaines}
        helper="Domaines terminologiques"
        icon={<Layers size={16} aria-hidden="true" />}
        tone="slate"
      />
    </section>
  );
}
