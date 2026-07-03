import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2 } from 'lucide-react';

import { ChartCanvas, COULEURS_GRAPHIQUE } from '@/components/analytics/ChartCanvas';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { analyticsApi } from '@/lib/analytics.api';

// ── Onglets ─────────────────────────────────────────────────────────────
type Onglet =
  | 'global'
  | 'accords'
  | 'courriers'
  | 'missions'
  | 'traductions'
  | 'demandes'
  | 'documents'
  | 'glossaire';

const ONGLETS: { cle: Onglet; label: string }[] = [
  { cle: 'global', label: 'Vue globale' },
  { cle: 'accords', label: 'Accords' },
  { cle: 'courriers', label: 'Courriers' },
  { cle: 'missions', label: 'Missions' },
  { cle: 'traductions', label: 'Traductions' },
  { cle: 'demandes', label: 'Demandes' },
  { cle: 'documents', label: 'Documents' },
  { cle: 'glossaire', label: 'Glossaire' },
];

// ── Période ─────────────────────────────────────────────────────────────
type PeriodePreset = '7j' | '30j' | '90j' | '6mois' | '1an' | 'personnalise';

const PRESETS: { cle: PeriodePreset; label: string; jours?: number }[] = [
  { cle: '7j', label: '7 derniers jours', jours: 7 },
  { cle: '30j', label: '30 derniers jours', jours: 30 },
  { cle: '90j', label: '90 derniers jours', jours: 90 },
  { cle: '6mois', label: '6 derniers mois', jours: 182 },
  { cle: '1an', label: '12 derniers mois', jours: 365 },
  { cle: 'personnalise', label: 'Personnalisé' },
];

function resoudrePeriode(
  preset: PeriodePreset,
  customDebut: string,
  customFin: string
): { dateDebut?: string; dateFin?: string } {
  if (preset === 'personnalise') {
    return {
      dateDebut: customDebut || undefined,
      dateFin: customFin || undefined,
    };
  }

  const config = PRESETS.find((p) => p.cle === preset);
  if (!config?.jours) return {};

  const fin = new Date();
  const debut = new Date();
  debut.setDate(debut.getDate() - config.jours);

  return {
    dateDebut: debut.toISOString().slice(0, 10),
    dateFin: fin.toISOString().slice(0, 10),
  };
}

// ── Composant principal ───────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [onglet, setOnglet] = useState<Onglet>('global');
  const [preset, setPreset] = useState<PeriodePreset>('90j');
  const [customDebut, setCustomDebut] = useState('');
  const [customFin, setCustomFin] = useState('');

  const periode = useMemo(
    () => resoudrePeriode(preset, customDebut, customFin),
    [preset, customDebut, customFin]
  );

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center">
            <BarChart3 size={18} className="text-anac-navy" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-anac-navy">Analytics & Rapports</h2>
            <p className="text-anac-muted text-sm mt-0.5">
              Pilotage stratégique — tendances et volumes d&apos;activité
            </p>
          </div>
        </div>

        {/* ── Sélecteur de période ──────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={preset} onValueChange={(v) => setPreset(v as PeriodePreset)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.cle} value={p.cle}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === 'personnalise' && (
            <>
              <input
                type="date"
                value={customDebut}
                onChange={(e) => setCustomDebut(e.target.value)}
                className="input h-9 text-sm w-36"
              />
              <span className="text-anac-muted text-sm">au</span>
              <input
                type="date"
                value={customFin}
                onChange={(e) => setCustomFin(e.target.value)}
                className="input h-9 text-sm w-36"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Barre d'onglets ──────────────────────────────────────────── */}
      <div
        role="tablist"
        className="flex items-center gap-1 border-b border-anac-border overflow-x-auto"
      >
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            role="tab"
            aria-selected={onglet === o.cle}
            onClick={() => setOnglet(o.cle)}
            className={cn(
              'px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px',
              onglet === o.cle
                ? 'border-anac-navy text-anac-navy'
                : 'border-transparent text-anac-muted hover:text-anac-text'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* ── Contenu de l'onglet actif ────────────────────────────────── */}
      {onglet === 'global' && <OngletGlobal periode={periode} />}
      {onglet === 'accords' && <OngletAccords periode={periode} />}
      {onglet === 'courriers' && <OngletCourriers periode={periode} />}
      {onglet === 'missions' && <OngletMissions periode={periode} />}
      {onglet === 'traductions' && <OngletTraductions periode={periode} />}
      {onglet === 'demandes' && <OngletDemandes periode={periode} />}
      {onglet === 'documents' && <OngletDocuments periode={periode} />}
      {onglet === 'glossaire' && <OngletGlossaire periode={periode} />}
    </div>
  );
}

// ── Onglet : Vue globale ──────────────────────────────────────────────────
interface GlobalAnalytics {
  accords: { totalSignes: number; tauxRenouvellementPourcentage: number };
  courriers: { totalVolume: number; tauxReponsePourcentage: number };
  missions: { totalMissions: number; delaiMoyenRapportJours: number | null };
  traductions: { totalTraductions: number; tauxCorrectionPourcentage: number };
  demandes: { totalTraitees: number; tauxUrgenceValideePourcentage: number };
  documents: { totalAjoutes: number; tauxSuccesOCRPourcentage: number };
  glossaire: { totalTermesAjoutes: number; partAutomatiqueM6Pourcentage: number };
}

function OngletGlobal({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-global', periode],
    queryFn: async () => {
      const res = await analyticsApi.global(periode);
      return res.data as GlobalAnalytics;
    },
  });

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

// ── Onglet : Accords (M1) ──────────────────────────────────────────────
interface AccordsAnalytics {
  dureeMoyenneParType: { type: string; dureeMoyenneJours: number | null; nombreAccords: number }[];
  tauxRenouvellement: { renouveles: number; clotures: number; tauxPourcentage: number };
  repartitionGeographique: { pays: string; region: string | null; nombrePartenaires: number }[];
  evolutionParMois: { mois: string; total: number }[];
}

const LABELS_TYPE_ORGANISATION: Record<string, string> = {
  anac_etrangere: 'ANAC étrangère',
  organisation_internationale: 'Organisation internationale',
  autre: 'Autre',
};

function formatMoisLabel(mois: string): string {
  const [annee, m] = mois.split('-');
  return new Date(parseInt(annee), parseInt(m) - 1).toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit',
  });
}

function OngletAccords({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-accords', periode],
    queryFn: async () => {
      const res = await analyticsApi.accords(periode);
      return res.data as AccordsAnalytics;
    },
  });

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
        {/* ── Évolution du nombre d'accords signés ────────────────────── */}
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

        {/* ── Taux de renouvellement vs clôture ────────────────────────── */}
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
        {/* ── Durée moyenne par type de partenaire ─────────────────────── */}
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

        {/* ── Répartition géographique des partenaires actifs ─────────── */}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-2">Pays</th>
                  <th className="text-left px-4 py-2">Région</th>
                  <th className="text-right px-4 py-2">Partenaires</th>
                </tr>
              </thead>
              <tbody>
                {data.repartitionGeographique.map((r) => (
                  <tr key={`${r.pays}-${r.region}`} className="table-row">
                    <td className="px-4 py-2 text-anac-text">{r.pays}</td>
                    <td className="px-4 py-2 text-anac-muted">{r.region ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-anac-navy">
                      {r.nombrePartenaires}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Onglet : Courriers (M4) ────────────────────────────────────────────
interface CourriersAnalytics {
  volumeParMoisEtDirection: { mois: string; entrant: number; sortant: number }[];
  tempsMoyenReponseJours: number | null;
  tauxReponse: { repondus: number; archivesSansReponse: number; tauxPourcentage: number };
  topOrganisationsExpeditrices: { organisation: string; nombreCourriers: number }[];
  evolutionCriticite: { date: string; normal: number; aSurveiller: number; critique: number }[];
}

function OngletCourriers({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-courriers', periode],
    queryFn: async () => {
      const res = await analyticsApi.courriers(periode);
      return res.data as CourriersAnalytics;
    },
  });

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
        {/* ── Volume par mois et direction ─────────────────────────────── */}
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

        {/* ── Évolution de la criticité ─────────────────────────────────── */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Évolution de la criticité</p>
          <p className="text-xs text-anac-muted mb-3">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-anac-navy/8 text-anac-navy text-[10px] font-medium mr-1">
              Historisé depuis juillet 2026
            </span>
            Photo quotidienne des courriers en attente, capturée chaque nuit — pas d&apos;historique
            avant cette date.
          </p>
          {data.evolutionCriticite.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Pas encore de capture — le job automatique s&apos;exécute chaque nuit à 23h55
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
        {/* ── Taux de réponse + délai moyen ────────────────────────────── */}
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
                  <> — délai moyen estimé : {data.tempsMoyenReponseJours} j*</>
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

        {/* ── Top organisations expéditrices ───────────────────────────── */}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-2">Organisation</th>
                  <th className="text-right px-4 py-2">Courriers</th>
                </tr>
              </thead>
              <tbody>
                {data.topOrganisationsExpeditrices.map((r) => (
                  <tr key={r.organisation} className="table-row">
                    <td className="px-4 py-2 text-anac-text">{r.organisation}</td>
                    <td className="px-4 py-2 text-right font-medium text-anac-navy">
                      {r.nombreCourriers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Onglet : Missions (M3) ─────────────────────────────────────────────
interface MissionsAnalytics {
  missionsParPays: { pays: string; nombreMissions: number }[];
  recommandations: {
    realisees: number;
    enCours: number;
    enAttenteActives: number;
    depassees: number;
  };
  delaiMoyenRapportJours: number | null;
  topParticipants: { nom: string; prenom: string; matricule: string; nombreMissions: number }[];
}

function OngletMissions({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-missions', periode],
    queryFn: async () => {
      const res = await analyticsApi.missions(periode);
      return res.data as MissionsAnalytics;
    },
  });

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
        {/* ── Missions par pays ─────────────────────────────────────────── */}
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

        {/* ── Recommandations ───────────────────────────────────────────── */}
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
                  <span className="text-anac-muted"> — nécessite une relance</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Délai moyen dépôt rapport ─────────────────────────────────── */}
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

        {/* ── Top participants ──────────────────────────────────────────── */}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-2">Agent</th>
                  <th className="text-right px-4 py-2">Missions</th>
                </tr>
              </thead>
              <tbody>
                {data.topParticipants.map((p) => (
                  <tr key={p.matricule} className="table-row">
                    <td className="px-4 py-2">
                      <div className="text-anac-text font-medium">
                        {p.prenom} {p.nom}
                      </div>
                      <div className="text-anac-muted text-xs font-mono">{p.matricule}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-anac-navy">
                      {p.nombreMissions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Onglet : Traductions (M6) ──────────────────────────────────────────
interface TraductionAnalytics {
  volumeParMois: { mois: string; nombreTraductions: number }[];
  tauxCorrectionIA: {
    valideesTelQuelles: number;
    corrigees: number;
    tauxCorrectionPourcentage: number;
  };
  tempsMoyenTraitementJours: number | null;
  repartitionDirection: { direction: string; nombre: number }[];
  termesAjoutesGlossaireDepuisM6: number;
}

const LABELS_DIRECTION: Record<string, string> = {
  fr_en: 'FR → EN',
  en_fr: 'EN → FR',
};

function OngletTraductions({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-traductions', periode],
    queryFn: async () => {
      const res = await analyticsApi.traductions(periode);
      return res.data as TraductionAnalytics;
    },
  });

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
        {/* ── Volume par mois ──────────────────────────────────────────── */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Volume traduit par mois</p>
          <p className="text-xs text-anac-muted mb-3">
            Traductions créées dans la période. Pas de décompte par segment — voir note en backlog.
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

        {/* ── Taux de correction IA ─────────────────────────────────────── */}
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
        {/* ── Répartition par direction ─────────────────────────────────── */}
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

        {/* ── Délai moyen de traitement ─────────────────────────────────── */}
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

        {/* ── Contribution au glossaire ─────────────────────────────────── */}
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

// ── Onglet : Demandes (M5) ─────────────────────────────────────────────
interface DemandesAnalytics {
  delaiMoyenPriseEnChargeJours: number | null;
  tauxUrgenceValidee: {
    demandeesUrgentes: number;
    valideesUrgentes: number;
    tauxPourcentage: number;
  };
  volumeParDemandeur: { nom: string; prenom: string; matricule: string; nombreDemandes: number }[];
  tauxCompletion: { validees: number; archivees: number; enCours: number };
}

function OngletDemandes({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-demandes', periode],
    queryFn: async () => {
      const res = await analyticsApi.demandes(periode);
      return res.data as DemandesAnalytics;
    },
  });

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
        {/* ── Délai moyen de prise en charge ───────────────────────────── */}
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

        {/* ── Taux d'urgence validée ────────────────────────────────────── */}
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

        {/* ── Taux de complétion ────────────────────────────────────────── */}
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

      {/* ── Volume par demandeur ────────────────────────────────────────── */}
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
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-2">Demandeur</th>
                <th className="text-right px-4 py-2">Demandes</th>
              </tr>
            </thead>
            <tbody>
              {data.volumeParDemandeur.map((d) => (
                <tr key={d.matricule} className="table-row">
                  <td className="px-4 py-2">
                    <div className="text-anac-text font-medium">
                      {d.prenom} {d.nom}
                    </div>
                    <div className="text-anac-muted text-xs font-mono">{d.matricule}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-anac-navy">
                    {d.nombreDemandes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Onglet : Documents (M8) ────────────────────────────────────────────
interface DocumentsAnalytics {
  volumeParMoisEtCategorie: { mois: string; categorie: string; nombre: number }[];
  tauxSuccesOCR: {
    traite: number;
    echec: number;
    aRetraiter: number;
    tauxSuccesPourcentage: number;
  };
  evolutionStockTotal: { mois: string; total: number }[];
}

const LABELS_CATEGORIE: Record<string, string> = {
  accord: 'Accord',
  correspondance: 'Correspondance',
  mission: 'Mission',
  traduction: 'Traduction',
  glossaire: 'Glossaire',
  autre: 'Autre',
};

const PALETTE_CATEGORIES = [
  COULEURS_GRAPHIQUE.navy,
  COULEURS_GRAPHIQUE.primaire,
  COULEURS_GRAPHIQUE.succes,
  COULEURS_GRAPHIQUE.attention,
  COULEURS_GRAPHIQUE.danger,
  COULEURS_GRAPHIQUE.muted,
];

function OngletDocuments({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-documents', periode],
    queryFn: async () => {
      const res = await analyticsApi.documents(periode);
      return res.data as DocumentsAnalytics;
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-16 text-anac-muted">
        <Loader2 size={18} className="animate-spin inline mr-2" />
        Chargement...
      </div>
    );
  }

  if (!data) return null;

  // Pivot mois × catégorie en séries par catégorie pour la barre empilée
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
        {/* ── Volume par mois et catégorie ─────────────────────────────── */}
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

        {/* ── Taux de succès OCR ────────────────────────────────────────── */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-anac-navy mb-0.5">Taux de succès OCR</p>
          <p className="text-xs text-anac-muted mb-3">
            Documents dont l&apos;OCR a été tenté dans la période — traité, échec, ou à retraiter.
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

      {/* ── Évolution du stock total ─────────────────────────────────────── */}
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

// ── Onglet : Glossaire (M7) ────────────────────────────────────────────
interface GlossaireAnalytics {
  croissanceParMois: { mois: string; nombreTermes: number }[];
  repartitionOrigine: { manuel: number; automatiqueM6: number };
  repartitionParDomaine: { domaine: string; nombre: number }[];
}

function OngletGlossaire({ periode }: { periode: { dateDebut?: string; dateFin?: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-glossaire', periode],
    queryFn: async () => {
      const res = await analyticsApi.glossaire(periode);
      return res.data as GlossaireAnalytics;
    },
  });

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
        {/* ── Croissance du glossaire ───────────────────────────────────── */}
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

        {/* ── Origine des termes ────────────────────────────────────────── */}
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

      {/* ── Répartition par domaine ──────────────────────────────────────── */}
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
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-2">Domaine</th>
                <th className="text-right px-4 py-2">Termes</th>
              </tr>
            </thead>
            <tbody>
              {data.repartitionParDomaine.map((d) => (
                <tr key={d.domaine} className="table-row">
                  <td className="px-4 py-2 text-anac-text">{d.domaine}</td>
                  <td className="px-4 py-2 text-right font-medium text-anac-navy">{d.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
