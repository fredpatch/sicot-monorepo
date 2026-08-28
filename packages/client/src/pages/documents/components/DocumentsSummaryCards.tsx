// packages/client/src/pages/documents/components/DocumentsSummaryCards.tsx
import { AlertTriangle, CheckCircle2, FileStack, Globe } from 'lucide-react';
import type { DocumentsAggregates } from '../documents.types';

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

// Portail publié n'est affiché que lorsque des compteurs fiables existent
// (voir documents.service.ts#getDocumentsAggregates côté serveur) - jamais
// dérivé de la page courante, jamais de compteurs inventés.
export function DocumentsSummaryCards({ aggregates }: { aggregates?: DocumentsAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        label="Total documents"
        value={aggregates?.total}
        helper="Tous documents confondus"
        icon={<FileStack size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="OCR traités"
        value={aggregates?.ocrTraites}
        helper="Disponibles pour traduction"
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="OCR à traiter"
        value={aggregates?.ocrEnAttente}
        helper="En attente de traitement"
        icon={<AlertTriangle size={16} aria-hidden="true" />}
        tone="amber"
      />
      <SummaryCard
        label="OCR en échec"
        value={aggregates?.ocrEchecs}
        helper="Nécessitent une correction"
        icon={<AlertTriangle size={16} aria-hidden="true" />}
        tone="red"
      />
      <SummaryCard
        label="Exposés sur le portail"
        value={aggregates?.portailExposes}
        helper={`${aggregates?.categories ?? '-'} catégorie(s) active(s)`}
        icon={<Globe size={16} aria-hidden="true" />}
        tone="blue"
      />
    </section>
  );
}
