// packages/client/src/pages/analytics/onglets/OngletGlossaire.tsx
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
import { useGlossaireAnalyticsQuery } from '../../hooks/queries';
import { formatMoisLabel } from '../../analytics.utils';
import type { Periode } from '../../analytics.types';

export function OngletGlossaire({ periode }: { periode: Periode }) {
  const { data, isLoading } = useGlossaireAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const { manuel, automatiqueM6 } = data.repartitionOrigine;
  const totalOrigine = manuel + automatiqueM6;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Croissance du glossaire</p>
          <p className="text-xs text-anac-muted mb-3">
            Termes ajoutés par mois, tous domaines confondus.
          </p>
          {data.croissanceParMois.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Croissance du glossaire par mois"
              config={{
                type: 'bar',
                data: {
                  labels: data.croissanceParMois.map((d) => formatMoisLabel(d.mois)),
                  datasets: [
                    {
                      label: 'Termes ajoutés',
                      data: data.croissanceParMois.map((d) => d.nombreTermes),
                      backgroundColor: COULEURS_GRAPHIQUE.navy,
                      borderRadius: 4,
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
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Origine des termes</p>
          <p className="text-xs text-anac-muted mb-3">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-anac-navy/8 text-anac-navy text-[10px] font-medium mr-1">
              Détection par convention
            </span>
            Ajoutés manuellement vs générés automatiquement depuis les corrections de traduction
            (M6).
          </p>
          {totalOrigine === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Aucun terme ajouté sur la période
            </p>
          ) : (
            <ChartCanvas
              label="Origine des termes du glossaire"
              config={{
                type: 'doughnut',
                data: {
                  labels: ['Ajoutés manuellement', 'Depuis corrections M6'],
                  datasets: [
                    {
                      data: [manuel, automatiqueM6],
                      backgroundColor: [COULEURS_GRAPHIQUE.primaire, COULEURS_GRAPHIQUE.succes],
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
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Répartition par domaine</p>
          <p className="text-xs text-anac-muted">
            Termes actifs ajoutés sur la période, par domaine technique.
          </p>
        </div>
        {data.repartitionParDomaine.length === 0 ? (
          <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domaine</TableHead>
                <TableHead className="text-right">Termes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.repartitionParDomaine.map((d) => (
                <TableRow key={d.domaine}>
                  <TableCell className="text-anac-text">{d.domaine}</TableCell>
                  <TableCell className="text-right font-medium text-anac-navy">
                    {d.nombre}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
