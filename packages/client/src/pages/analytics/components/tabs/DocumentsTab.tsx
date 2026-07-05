// packages/client/src/pages/analytics/onglets/OngletDocuments.tsx
import { Loader2 } from 'lucide-react';
import { ChartCanvas, COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';
import { useDocumentsAnalyticsQuery } from '../../hooks/queries';
import { LABELS_CATEGORIE, PALETTE_CATEGORIES } from '../../analytics.constants';
import { formatMoisLabel } from '../../analytics.utils';
import type { Periode } from '../../analytics.types';

export function OngletDocuments({ periode }: { periode: Periode }) {
  const { data, isLoading } = useDocumentsAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const mois = Array.from(new Set(data.volumeParMoisEtCategorie.map((d) => d.mois))).sort();
  const categories = Array.from(new Set(data.volumeParMoisEtCategorie.map((d) => d.categorie)));
  const seriesParCategorie = categories.map((cat, i) => ({
    label: LABELS_CATEGORIE[cat] ?? cat,
    data: mois.map(
      (m) =>
        data.volumeParMoisEtCategorie.find((d) => d.mois === m && d.categorie === cat)?.nombre ?? 0
    ),
    backgroundColor: PALETTE_CATEGORIES[i % PALETTE_CATEGORIES.length],
    borderRadius: 3,
  }));

  const { traite, echec, aRetraiter, tauxSuccesPourcentage } = data.tauxSuccesOCR;
  const totalOCR = traite + echec + aRetraiter;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">
            Volume par mois et catégorie
          </p>
          <p className="text-xs text-anac-muted mb-3">
            Documents ajoutés dans la période, répartis par catégorie.
          </p>
          {mois.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Volume de documents par mois et catégorie"
              config={{
                type: 'bar',
                data: { labels: mois.map((m) => formatMoisLabel(m)), datasets: seriesParCategorie },
                options: {
                  plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 8 } },
                  },
                  scales: {
                    x: {
                      stacked: true,
                      ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted },
                      grid: { display: false },
                    },
                    y: {
                      stacked: true,
                      ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted, stepSize: 1 },
                      grid: { color: COULEURS_GRAPHIQUE.grille },
                      beginAtZero: true,
                    },
                  },
                },
              }}
            />
          )}
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Taux de succès OCR</p>
          <p className="text-xs text-anac-muted mb-3">
            Documents dont l&apos;OCR a été tenté dans la période - traité, échec, ou à retraiter.
          </p>
          {totalOCR === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Aucun document traité par OCR sur la période
            </p>
          ) : (
            <>
              <ChartCanvas
                label="Taux de succès de l'OCR"
                config={{
                  type: 'doughnut',
                  data: {
                    labels: ['Traité', 'À retraiter', 'Échec'],
                    datasets: [
                      {
                        data: [traite, aRetraiter, echec],
                        backgroundColor: [
                          COULEURS_GRAPHIQUE.succes,
                          COULEURS_GRAPHIQUE.attention,
                          COULEURS_GRAPHIQUE.danger,
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                      },
                    ],
                  },
                  options: {
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: { font: { size: 11 }, boxWidth: 10, padding: 8 },
                      },
                    },
                    cutout: '65%',
                  },
                }}
              />
              <p className="text-center text-xs text-anac-muted mt-2">
                {tauxSuccesPourcentage}% de succès OCR sur la période
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold text-anac-navy mb-0.5">Évolution du stock total</p>
        <p className="text-xs text-anac-muted mb-3">
          Nombre cumulé de documents archivés, base incluant tout ce qui existait avant le début de
          la période.
        </p>
        {data.evolutionStockTotal.length === 0 ? (
          <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
        ) : (
          <ChartCanvas
            label="Évolution du stock total de documents"
            config={{
              type: 'line',
              data: {
                labels: data.evolutionStockTotal.map((d) => formatMoisLabel(d.mois)),
                datasets: [
                  {
                    label: 'Stock cumulé',
                    data: data.evolutionStockTotal.map((d) => d.total),
                    borderColor: COULEURS_GRAPHIQUE.navy,
                    backgroundColor: `${COULEURS_GRAPHIQUE.navy}22`,
                    fill: true,
                    tension: 0.2,
                  },
                ],
              },
              options: {
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted },
                    grid: { display: false },
                  },
                  y: {
                    ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted },
                    grid: { color: COULEURS_GRAPHIQUE.grille },
                  },
                },
              },
            }}
            hauteur={180}
          />
        )}
      </div>
    </div>
  );
}
