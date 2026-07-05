// packages/client/src/pages/analytics/onglets/OngletTraductions.tsx
import { Loader2 } from 'lucide-react';
import { ChartCanvas, COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';
import { useTraductionsAnalyticsQuery } from '../../hooks/queries';
import { LABELS_DIRECTION } from '../../analytics.constants';
import { formatMoisLabel } from '../../analytics.utils';
import type { Periode } from '../../analytics.types';

export function OngletTraductions({ periode }: { periode: Periode }) {
  const { data, isLoading } = useTraductionsAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const { valideesTelQuelles, corrigees, tauxCorrectionPourcentage } = data.tauxCorrectionIA;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Volume traduit par mois</p>
          <p className="text-xs text-anac-muted mb-3">
            Traductions créées dans la période. Pas de décompte par segment - voir note en backlog.
          </p>
          {data.volumeParMois.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Volume de traductions par mois"
              config={{
                type: 'line',
                data: {
                  labels: data.volumeParMois.map((d) => formatMoisLabel(d.mois)),
                  datasets: [
                    {
                      label: 'Traductions',
                      data: data.volumeParMois.map((d) => d.nombreTraductions),
                      borderColor: COULEURS_GRAPHIQUE.primaire,
                      backgroundColor: `${COULEURS_GRAPHIQUE.primaire}22`,
                      fill: true,
                      tension: 0.3,
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
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Fiabilité de l&apos;IA</p>
          <p className="text-xs text-anac-muted mb-3">
            Traductions approuvées : validées telles quelles par un relecteur vs corrigées avant
            validation.
          </p>
          {valideesTelQuelles + corrigees === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Aucune traduction approuvée sur la période
            </p>
          ) : (
            <>
              <ChartCanvas
                label="Taux de correction des traductions IA"
                config={{
                  type: 'doughnut',
                  data: {
                    labels: ['Validées telles quelles', 'Corrigées'],
                    datasets: [
                      {
                        data: [valideesTelQuelles, corrigees],
                        backgroundColor: [COULEURS_GRAPHIQUE.succes, COULEURS_GRAPHIQUE.attention],
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
                {tauxCorrectionPourcentage}% des traductions IA nécessitent une correction humaine
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Répartition par direction</p>
          <p className="text-xs text-anac-muted mb-3">Sens de traduction sur la période.</p>
          {data.repartitionDirection.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée</p>
          ) : (
            <ChartCanvas
              label="Répartition des traductions par direction"
              config={{
                type: 'doughnut',
                data: {
                  labels: data.repartitionDirection.map(
                    (d) => LABELS_DIRECTION[d.direction] ?? d.direction
                  ),
                  datasets: [
                    {
                      data: data.repartitionDirection.map((d) => d.nombre),
                      backgroundColor: [COULEURS_GRAPHIQUE.primaire, COULEURS_GRAPHIQUE.navy],
                      borderWidth: 2,
                      borderColor: '#ffffff',
                    },
                  ],
                },
                options: {
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { font: { size: 11 }, boxWidth: 10, padding: 8 },
                    },
                  },
                  cutout: '65%',
                },
              }}
              hauteur={180}
            />
          )}
        </div>

        <div className="card p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Délai moyen de traitement</p>
          <p className="text-xs text-anac-muted mb-4">Création → approbation.</p>
          {data.tempsMoyenTraitementJours === null ? (
            <p className="text-sm text-anac-muted py-4">Aucune traduction approuvée</p>
          ) : (
            <>
              <p className="text-4xl font-bold text-anac-navy">
                {data.tempsMoyenTraitementJours}
                <span className="text-base font-medium text-anac-muted ml-1">jours</span>
              </p>
              <p className="text-[10px] text-anac-muted/70 mt-2">
                *Estimation via dernière modification, pas une date d&apos;approbation dédiée
              </p>
            </>
          )}
        </div>

        <div className="card p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Contribution au glossaire</p>
          <p className="text-xs text-anac-muted mb-4">
            Termes ajoutés automatiquement depuis les corrections.
          </p>
          <p className="text-4xl font-bold text-anac-navy">
            {data.termesAjoutesGlossaireDepuisM6}
            <span className="text-base font-medium text-anac-muted ml-1">termes</span>
          </p>
        </div>
      </div>
    </div>
  );
}
