// packages/client/src/pages/analytics/onglets/OngletDemandes.tsx
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
import { useDemandesAnalyticsQuery } from '../../hooks/queries';
import type { Periode } from '../../analytics.types';

export function OngletDemandes({ periode }: { periode: Periode }) {
  const { data, isLoading } = useDemandesAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const { validees, archivees, enCours } = data.tauxCompletion;
  const totalCompletion = validees + archivees + enCours;
  const { demandeesUrgentes, valideesUrgentes, tauxPourcentage } = data.tauxUrgenceValidee;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">
            Délai moyen de prise en charge
          </p>
          <p className="text-xs text-anac-muted mb-4">
            Soumission → passage hors statut &quot;soumise&quot;.
          </p>
          {data.delaiMoyenPriseEnChargeJours === null ? (
            <p className="text-sm text-anac-muted py-4">
              Aucune demande prise en charge sur la période
            </p>
          ) : (
            <>
              <p className="text-4xl font-bold text-anac-navy">
                {data.delaiMoyenPriseEnChargeJours}
                <span className="text-base font-medium text-anac-muted ml-1">jours</span>
              </p>
              <p className="text-[10px] text-anac-muted/70 mt-2">
                *Estimation via dernière modification, pas une date de prise en charge dédiée
              </p>
            </>
          )}
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Urgence demandée vs validée</p>
          <p className="text-xs text-anac-muted mb-3">
            Sur les demandes marquées &quot;urgente&quot; par le demandeur, combien sont confirmées
            urgentes.
          </p>
          {demandeesUrgentes === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Aucune demande urgente sur la période
            </p>
          ) : (
            <>
              <ChartCanvas
                label="Taux d'urgence validée vs demandée"
                config={{
                  type: 'doughnut',
                  data: {
                    labels: ['Confirmées urgentes', 'Repriorisées'],
                    datasets: [
                      {
                        data: [valideesUrgentes, demandeesUrgentes - valideesUrgentes],
                        backgroundColor: [COULEURS_GRAPHIQUE.danger, COULEURS_GRAPHIQUE.muted],
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
                hauteur={180}
              />
              <p className="text-center text-xs text-anac-muted mt-2">
                {tauxPourcentage}% des urgences demandées confirmées
              </p>
            </>
          )}
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Statut des demandes</p>
          <p className="text-xs text-anac-muted mb-3">
            Répartition validées / en cours / archivées.
          </p>
          {totalCompletion === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
          ) : (
            <ChartCanvas
              label="Statut de complétion des demandes"
              config={{
                type: 'doughnut',
                data: {
                  labels: ['Validées', 'En cours', 'Archivées'],
                  datasets: [
                    {
                      data: [validees, enCours, archivees],
                      backgroundColor: [
                        COULEURS_GRAPHIQUE.succes,
                        COULEURS_GRAPHIQUE.primaire,
                        COULEURS_GRAPHIQUE.muted,
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
              hauteur={180}
            />
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Volume par demandeur</p>
          <p className="text-xs text-anac-muted">
            Top 10 des agents ayant soumis le plus de demandes sur la période.
          </p>
        </div>
        {data.volumeParDemandeur.length === 0 ? (
          <p className="text-sm text-anac-muted text-center py-8">Aucune donnée sur la période</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Demandeur</TableHead>
                <TableHead className="text-right">Demandes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.volumeParDemandeur.map((d) => (
                <TableRow key={d.matricule}>
                  <TableCell>
                    <div className="text-anac-text font-medium">
                      {d.prenom} {d.nom}
                    </div>
                    <div className="text-anac-muted text-xs font-mono">{d.matricule}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-anac-navy">
                    {d.nombreDemandes}
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
