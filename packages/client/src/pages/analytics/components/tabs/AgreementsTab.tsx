// packages/client/src/pages/analytics/onglets/OngletAccords.tsx
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
import { useAccordsAnalyticsQuery } from '../../hooks/queries';
import { LABELS_TYPE_ORGANISATION } from '../../analytics.constants';
import { formatMoisLabel } from '../../analytics.utils';
import type { Periode } from '../../analytics.types';

export function OngletAccords({ periode }: { periode: Periode }) {
  const { data, isLoading } = useAccordsAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const { renouveles, clotures, tauxPourcentage } = data.tauxRenouvellement;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Accords signés par mois</p>
          <p className="text-xs text-anac-muted mb-3">
            Accords dont la date de signature se situe dans la période sélectionnée.
          </p>
          {data.evolutionParMois.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Accords signés par mois"
              config={{
                type: 'line',
                data: {
                  labels: data.evolutionParMois.map((d) => formatMoisLabel(d.mois)),
                  datasets: [
                    {
                      label: 'Accords signés',
                      data: data.evolutionParMois.map((d) => d.total),
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
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Renouvellement vs clôture</p>
          <p className="text-xs text-anac-muted mb-3">
            Parmi les accords conclus sur la période : renouvelés (statut « en renouvellement ») vs
            clôturés sans suite (statut « expiré »).
          </p>
          {renouveles + clotures === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Aucun accord expiré ou renouvelé sur la période
            </p>
          ) : (
            <>
              <ChartCanvas
                label="Taux de renouvellement vs clôture"
                config={{
                  type: 'doughnut',
                  data: {
                    labels: ['Renouvelés', 'Clôturés'],
                    datasets: [
                      {
                        data: [renouveles, clotures],
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
                {tauxPourcentage}% des accords conclus sur la période ont été renouvelés
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">
            Durée moyenne par type de partenaire
          </p>
          <p className="text-xs text-anac-muted mb-3">
            Jours entre signature et expiration, pour les accords avec date d&apos;expiration
            renseignée. Un accord multi-partenaires compte pour chaque type impliqué.
          </p>
          {data.dureeMoyenneParType.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Durée moyenne des accords par type de partenaire"
              config={{
                type: 'bar',
                data: {
                  labels: data.dureeMoyenneParType.map(
                    (d) => LABELS_TYPE_ORGANISATION[d.type] ?? d.type
                  ),
                  datasets: [
                    {
                      label: 'Durée moyenne (jours)',
                      data: data.dureeMoyenneParType.map((d) => d.dureeMoyenneJours ?? 0),
                      backgroundColor: COULEURS_GRAPHIQUE.navy,
                      borderRadius: 4,
                    },
                  ],
                },
                options: {
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted },
                      grid: { color: COULEURS_GRAPHIQUE.grille },
                    },
                    y: {
                      ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted },
                      grid: { display: false },
                    },
                  },
                },
              }}
            />
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-anac-navy mb-0.5">
              Répartition géographique des partenaires actifs
            </p>
            <p className="text-xs text-anac-muted flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-anac-navy/8 text-anac-navy text-[10px] font-medium">
                Indépendant de la période
              </span>
              Partenaires actuellement actifs, à date.
            </p>
          </div>
          {data.repartitionGeographique.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucun partenaire actif</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pays</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead className="text-right">Partenaires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.repartitionGeographique.map((r) => (
                  <TableRow key={`${r.pays}-${r.region}`}>
                    <TableCell className="text-anac-text">{r.pays}</TableCell>
                    <TableCell className="text-anac-muted">{r.region ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium text-anac-navy">
                      {r.nombrePartenaires}
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
