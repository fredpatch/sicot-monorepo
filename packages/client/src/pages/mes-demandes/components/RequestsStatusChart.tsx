// packages/client/src/pages/mes-demandes/components/RequestsStatusChart.tsx
import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';

import { ChartCanvas, COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';
import type { DemandesAggregates } from '@/lib/demandes.api';

const SEGMENTS = [
  { key: 'aAssigner', label: 'À assigner', color: COULEURS_GRAPHIQUE.attention },
  { key: 'enCours', label: 'En cours', color: COULEURS_GRAPHIQUE.primaire },
  { key: 'enRelecture', label: 'En relecture', color: '#7c6fd6' },
  { key: 'validees', label: 'Validées', color: COULEURS_GRAPHIQUE.succes },
  { key: 'archivees', label: 'Archivées', color: COULEURS_GRAPHIQUE.muted },
] as const;

export function RequestsStatusChart({ aggregates }: { aggregates?: DemandesAggregates }) {
  const total = aggregates?.total ?? 0;

  const config = useMemo<ChartConfiguration<'doughnut'>>(
    () => ({
      type: 'doughnut',
      data: {
        labels: SEGMENTS.map((s) => s.label),
        datasets: [
          {
            data: SEGMENTS.map((s) => aggregates?.[s.key] ?? 0),
            backgroundColor: SEGMENTS.map((s) => s.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: '68%',
        plugins: {
          legend: { display: false },
        },
      },
    }),
    [aggregates]
  );

  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-anac-navy">Répartition par statut</h3>

      {total === 0 ? (
        <p className="mt-6 py-4 text-center text-xs text-anac-muted">Aucune demande pour le moment.</p>
      ) : (
        <>
          <div className="mt-2">
            <ChartCanvas config={config} hauteur={160} label="Répartition des demandes par statut" />
          </div>
          <ul className="mt-3 space-y-1.5">
            {SEGMENTS.map((s) => {
              const value = aggregates?.[s.key] ?? 0;
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <li key={s.key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-anac-muted">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    {s.label}
                  </span>
                  <span className="font-medium text-anac-navy">
                    {value} ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
