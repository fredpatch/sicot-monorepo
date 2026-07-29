import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';

import { ChartCanvas, COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';
import type { TraductionParMois } from '../dashboard.types';
import { asNumber, monthLabel } from '../dashboard.utils';

export function TranslationWorkloadChart({ data }: { data: TraductionParMois[] }) {
  const config = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: data.map((row) => monthLabel(row.mois)),
        datasets: [
          {
            label: 'Reçues',
            data: data.map((row) => asNumber(row.total)),
            backgroundColor: COULEURS_GRAPHIQUE.primaire,
            borderRadius: 3,
          },
          {
            label: 'Approuvées',
            data: data.map((row) => asNumber(row.approuvees)),
            backgroundColor: COULEURS_GRAPHIQUE.succes,
            borderRadius: 3,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, boxHeight: 10, color: '#1a2340', font: { size: 11 } },
          },
        },
        scales: {
          x: {
            ticks: { color: '#6b7a99', font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#6b7a99', precision: 0, font: { size: 11 } },
            grid: { color: '#d1d9e6' },
          },
        },
      },
    }),
    [data]
  );

  const received = data.reduce((sum, row) => sum + asNumber(row.total), 0);
  const approved = data.reduce((sum, row) => sum + asNumber(row.approuvees), 0);

  return (
    <section className="card p-4 lg:col-span-5" aria-labelledby="dashboard-workload-title">
      <h3 id="dashboard-workload-title" className="mb-2 text-base font-bold text-anac-navy">
        Charge des 6 derniers mois
      </h3>
      {data.length > 0 ? (
        <>
          <ChartCanvas
            config={config}
            hauteur={230}
            label="Charge des six derniers mois: traductions reçues et approuvées"
          />
          <p className="sr-only">
            {received} traductions reçues, {approved} traductions approuvées.
          </p>
        </>
      ) : (
        <div className="flex h-56 items-center justify-center text-sm text-anac-muted">
          Aucune donnée de traduction disponible.
        </div>
      )}
    </section>
  );
}
