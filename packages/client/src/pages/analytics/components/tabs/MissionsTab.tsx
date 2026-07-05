// packages/client/src/pages/analytics/onglets/OngletMissions.tsx
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
import { useMissionsAnalyticsQuery } from '../../hooks/queries';
import type { Periode } from '../../analytics.types';

export function OngletMissions({ periode }: { periode: Periode }) {
  const { data, isLoading } = useMissionsAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const { realisees, enCours, enAttenteActives, depassees } = data.recommandations;
  const totalRecos = realisees + enCours + enAttenteActives + depassees;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Missions par pays</p>
          <p className="text-xs text-anac-muted mb-3">
            Missions dont la date de début se situe dans la période sélectionnée.
          </p>
          {data.missionsParPays.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Nombre de missions par pays"
              config={{
                type: 'bar',
                data: {
                  labels: data.missionsParPays.map((d) => d.pays),
                  datasets: [
                    {
                      label: 'Missions',
                      data: data.missionsParPays.map((d) => d.nombreMissions),
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
                      ticks: { font: { size: 11 }, color: COULEURS_GRAPHIQUE.muted, stepSize: 1 },
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

        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Recommandations</p>
          <p className="text-xs text-anac-muted mb-3">
            Statut des recommandations issues des missions démarrées sur la période.
          </p>
          {totalRecos === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <>
              <ChartCanvas
                label="Statut des recommandations de mission"
                config={{
                  type: 'doughnut',
                  data: {
                    labels: ['Réalisées', 'En cours', 'En attente', 'Dépassées'],
                    datasets: [
                      {
                        data: [realisees, enCours, enAttenteActives, depassees],
                        backgroundColor: [
                          COULEURS_GRAPHIQUE.succes,
                          COULEURS_GRAPHIQUE.primaire,
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
              {depassees > 0 && (
                <p className="text-center text-xs mt-2">
                  <span className="text-anac-danger font-medium">
                    {depassees} dépassée{depassees > 1 ? 's' : ''}
                  </span>
                  <span className="text-anac-muted"> - nécessite une relance</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">
            Délai moyen de dépôt du rapport
          </p>
          <p className="text-xs text-anac-muted mb-4">
            Entre la fin de mission et le dépôt effectif du rapport, pour les missions terminées sur
            la période.
          </p>
          {data.delaiMoyenRapportJours === null ? (
            <p className="text-sm text-anac-muted py-4">Aucun rapport déposé sur la période</p>
          ) : (
            <p className="text-4xl font-bold text-anac-navy">
              {data.delaiMoyenRapportJours}
              <span className="text-base font-medium text-anac-muted ml-1">jours</span>
            </p>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-anac-navy mb-0.5">Agents les plus mobilisés</p>
            <p className="text-xs text-anac-muted">
              Top 10 des agents par nombre de missions sur la période.
            </p>
          </div>
          {data.topParticipants.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Missions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topParticipants.map((p) => (
                  <TableRow key={p.matricule}>
                    <TableCell>
                      <div className="text-anac-text font-medium">
                        {p.prenom} {p.nom}
                      </div>
                      <div className="text-anac-muted text-xs font-mono">{p.matricule}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-anac-navy">
                      {p.nombreMissions}
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
