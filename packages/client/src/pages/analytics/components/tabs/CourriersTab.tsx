// packages/client/src/pages/analytics/onglets/OngletCourriers.tsx
import { Loader2 } from 'lucide-react';
import { ChartCanvas, COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useCourriersAnalyticsQuery } from '../../hooks/queries';
import { formatMoisLabel } from '../../analytics.utils';
import type { Periode } from '../../analytics.types';

export function OngletCourriers({ periode }: { periode: Periode }) {
  const { data, isLoading } = useCourriersAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const { repondus, archivesSansReponse, tauxPourcentage } = data.tauxReponse;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Volume par mois</p>
          <p className="text-xs text-anac-muted mb-3">
            Courriers reçus dans la période, répartis entrant / sortant, par mois de réception.
          </p>
          {data.volumeParMoisEtDirection.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Volume de courriers par mois et direction"
              config={{
                type: 'bar',
                data: {
                  labels: data.volumeParMoisEtDirection.map((d) => formatMoisLabel(d.mois)),
                  datasets: [
                    {
                      label: 'Entrant',
                      data: data.volumeParMoisEtDirection.map((d) => d.entrant),
                      backgroundColor: COULEURS_GRAPHIQUE.primaire,
                      borderRadius: 4,
                    },
                    {
                      label: 'Sortant',
                      data: data.volumeParMoisEtDirection.map((d) => d.sortant),
                      backgroundColor: COULEURS_GRAPHIQUE.navy,
                      borderRadius: 4,
                    },
                  ],
                },
                options: {
                  plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 10 } },
                  },
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
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Évolution de la criticité</p>
          <p className="text-xs text-anac-muted mb-3">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-anac-navy/8 text-anac-navy text-[10px] font-medium mr-1">
              Historisé depuis juillet 2026
            </span>
            Photo quotidienne des courriers en attente, capturée chaque nuit - pas d&apos;historique
            avant cette date.
          </p>
          {data.evolutionCriticite.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Pas encore de capture - le job automatique s&apos;exécute chaque nuit à 23h55
            </p>
          ) : (
            <ChartCanvas
              label="Évolution de la criticité des courriers"
              config={{
                type: 'line',
                data: {
                  labels: data.evolutionCriticite.map((d) =>
                    new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                  ),
                  datasets: [
                    {
                      label: 'Normal',
                      data: data.evolutionCriticite.map((d) => d.normal),
                      borderColor: COULEURS_GRAPHIQUE.succes,
                      backgroundColor: `${COULEURS_GRAPHIQUE.succes}33`,
                      fill: true,
                      tension: 0.3,
                    },
                    {
                      label: 'À surveiller',
                      data: data.evolutionCriticite.map((d) => d.aSurveiller),
                      borderColor: COULEURS_GRAPHIQUE.attention,
                      backgroundColor: `${COULEURS_GRAPHIQUE.attention}33`,
                      fill: true,
                      tension: 0.3,
                    },
                    {
                      label: 'Critique',
                      data: data.evolutionCriticite.map((d) => d.critique),
                      borderColor: COULEURS_GRAPHIQUE.danger,
                      backgroundColor: `${COULEURS_GRAPHIQUE.danger}33`,
                      fill: true,
                      tension: 0.3,
                    },
                  ],
                },
                options: {
                  plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 10 } },
                  },
                  scales: {
                    x: {
                      ticks: { font: { size: 10 }, color: COULEURS_GRAPHIQUE.muted },
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Taux de réponse</p>
          <p className="text-xs text-anac-muted mb-3">
            Courriers répondus vs archivés sans réponse, sur la période.
          </p>
          {repondus + archivesSansReponse === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <>
              <ChartCanvas
                label="Taux de réponse aux courriers"
                config={{
                  type: 'doughnut',
                  data: {
                    labels: ['Répondus', 'Archivés sans réponse'],
                    datasets: [
                      {
                        data: [repondus, archivesSansReponse],
                        backgroundColor: [COULEURS_GRAPHIQUE.succes, COULEURS_GRAPHIQUE.muted],
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
                {tauxPourcentage}% répondus
                {data.tempsMoyenReponseJours !== null && (
                  <> - délai moyen estimé : {data.tempsMoyenReponseJours} j*</>
                )}
              </p>
              {data.tempsMoyenReponseJours !== null && (
                <p className="text-center text-[10px] text-anac-muted/70 mt-1">
                  *Estimation basée sur la dernière modification du courrier, pas une date de
                  réponse dédiée
                </p>
              )}
            </>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-anac-navy mb-0.5">
              Top organisations expéditrices
            </p>
            <p className="text-xs text-anac-muted">
              5 organisations envoyant le plus de courriers entrants sur la période.
            </p>
          </div>
          {data.topOrganisationsExpeditrices.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead className="text-right">Courriers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topOrganisationsExpeditrices.map((r) => (
                  <TableRow key={r.organisation}>
                    <TableCell className="text-anac-text">{r.organisation}</TableCell>
                    <TableCell className="text-right font-medium text-anac-navy">
                      {r.nombreCourriers}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
