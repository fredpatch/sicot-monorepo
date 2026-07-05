// packages/client/src/pages/analytics/onglets/OngletGlobal.tsx
import { Loader2 } from 'lucide-react';
import type { Periode } from '../../analytics.types';
import { useGlobalAnalyticsQuery } from '../../hooks/queries';

export function OngletGlobal({ periode }: { periode: Periode }) {
  const { data, isLoading } = useGlobalAnalyticsQuery(periode);

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  const cartes = [
    {
      titre: 'Accords signés',
      total: data.accords.totalSignes,
      sousLigne: `${data.accords.tauxRenouvellementPourcentage}% renouvelés`,
    },
    {
      titre: 'Courriers traités',
      total: data.courriers.totalVolume,
      sousLigne: `${data.courriers.tauxReponsePourcentage}% répondus`,
    },
    {
      titre: 'Missions',
      total: data.missions.totalMissions,
      sousLigne:
        data.missions.delaiMoyenRapportJours !== null
          ? `${data.missions.delaiMoyenRapportJours}j délai rapport moyen`
          : 'Délai rapport : n/d',
    },
    {
      titre: 'Traductions',
      total: data.traductions.totalTraductions,
      sousLigne: `${data.traductions.tauxCorrectionPourcentage}% corrigées vs IA`,
    },
    {
      titre: 'Demandes traitées',
      total: data.demandes.totalTraitees,
      sousLigne: `${data.demandes.tauxUrgenceValideePourcentage}% urgences validées`,
    },
    {
      titre: 'Documents archivés',
      total: data.documents.totalAjoutes,
      sousLigne: `${data.documents.tauxSuccesOCRPourcentage}% succès OCR`,
    },
    {
      titre: 'Termes glossaire',
      total: data.glossaire.totalTermesAjoutes,
      sousLigne: `${data.glossaire.partAutomatiqueM6Pourcentage}% via delta M6`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {cartes.map((c) => (
        <div key={c.titre} className="card p-4">
          <p className="text-xs text-anac-muted uppercase tracking-wide font-semibold">{c.titre}</p>
          <p className="text-2xl font-bold text-anac-navy mt-1.5">{c.total}</p>
          <p className="text-xs text-anac-muted mt-1">{c.sousLigne}</p>
        </div>
      ))}
    </div>
  );
}
