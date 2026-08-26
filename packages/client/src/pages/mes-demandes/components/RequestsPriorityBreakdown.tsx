// packages/client/src/pages/mes-demandes/components/RequestsPriorityBreakdown.tsx
import type { DemandesAggregates } from '@/lib/demandes.api';

export function RequestsPriorityBreakdown({ aggregates }: { aggregates?: DemandesAggregates }) {
  const urgentes = aggregates?.urgentes ?? 0;
  const normales = aggregates?.normales ?? 0;
  const total = urgentes + normales;
  const pctUrgentes = total > 0 ? Math.round((urgentes / total) * 100) : 0;
  const pctNormales = total > 0 ? Math.round((normales / total) * 100) : 0;

  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-anac-navy">Priorité des demandes</h3>

      {total === 0 ? (
        <p className="mt-3 py-2 text-center text-xs text-anac-muted">Aucune demande pour le moment.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-anac-muted">Urgentes</span>
              <span className="font-medium text-anac-navy">
                {urgentes} ({pctUrgentes}%)
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-anac-gray">
              <div className="h-full rounded-full bg-anac-danger" style={{ width: `${pctUrgentes}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-anac-muted">Normales</span>
              <span className="font-medium text-anac-navy">
                {normales} ({pctNormales}%)
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-anac-gray">
              <div className="h-full rounded-full bg-anac-blue" style={{ width: `${pctNormales}%` }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
