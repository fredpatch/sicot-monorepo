import { AlertCircle, Globe2, ShieldCheck, Users, UserCheck, UserX } from 'lucide-react';

import type { OrganisationsAggregates } from '../partenaires.types';

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

export function PartenairesSummaryCards({ aggregates }: { aggregates?: OrganisationsAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard
        label="Total partenaires"
        value={aggregates?.total}
        helper="Tous pays confondus"
        icon={<Users size={16} aria-hidden="true" />}
        tone="blue"
      />
      <SummaryCard
        label="Organisations actives"
        value={aggregates?.active}
        helper="Partenaires actifs"
        icon={<ShieldCheck size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="Avec contact"
        value={aggregates?.withActiveContact}
        helper="Au moins un contact actif"
        icon={<UserCheck size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="Sans contact"
        value={aggregates?.withoutActiveContact}
        helper="Action requise"
        icon={<AlertCircle size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="Inactifs"
        value={aggregates?.inactive}
        helper="Non actifs"
        icon={<UserX size={16} aria-hidden="true" />}
        tone="red"
      />
      <SummaryCard
        label="Pays représentés"
        value={aggregates?.representedCountries}
        helper="Couverture internationale"
        icon={<Globe2 size={16} aria-hidden="true" />}
        tone="slate"
      />
    </section>
  );
}
