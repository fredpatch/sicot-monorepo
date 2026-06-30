import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  FileText,
  Mail,
  Globe,
  Languages,
  BookOpen,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ArrowRight,
  Send,
} from 'lucide-react';

import { dashboardApi } from '@/lib/dashboard.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardData {
  kpi: {
    accordsActifs: {
      total: number;
      enAlerte: number;
      critique: boolean;
    };
    couriersSansReponse: {
      total: number;
      aSurveiller: number;
      critique: number;
    };
    missionsEnCours: {
      total: number;
      logistiqueNonConfirmee: number;
    };
    traductionsEnAttente: number;
    documentsArchives: number;
    termesGlossaire: number;
    demandesOuvertes: number;
    recommandationsEnAttente: {
      total: number;
      depassees: number;
    };
  };
  accordsExpirant: {
    id: number;
    reference: string;
    titre: string;
    statut: string;
    dateExpiration: string;
    joursRestants: number;
  }[];
  couriersSansReponse: {
    id: number;
    reference: string;
    objet: string;
    dateReception: string;
    joursAttente: number;
  }[];
  recommandationsEnAttente: {
    id: number;
    texte: string;
    missionId: number;
    dateLimite?: string;
    depasse: boolean;
  }[];
  traductionsParMois: { mois: string; total: number; approuvees: number }[];
  demandesParStatut: { statut: string; total: number }[];
  documentsParCategorie: { categorie: string; total: number }[];
  activiteRecente: {
    type: string;
    reference: string;
    label: string;
    date: string;
  }[];
  notificationsRecentes: {
    id: number;
    type: string;
    entiteId: number;
    destinataireEmail: string;
    destinataireNom?: string;
    declencheParNom?: string;
    statut: string;
    createdAt: string;
  }[];
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icone,
  couleur,
  niveau,
  sousLigne,
  onClick,
}: {
  label: string;
  value: number;
  icone: React.ReactNode;
  couleur: string;
  niveau?: 'normal' | 'alerte' | 'critique';
  sousLigne?: string;
  onClick?: () => void;
}) {
  const bordure =
    niveau === 'critique'
      ? 'border-red-300 bg-red-50/50'
      : niveau === 'alerte'
        ? 'border-amber-200 bg-amber-50/30'
        : '';

  return (
    <button
      onClick={onClick}
      className={`card p-5 text-left w-full transition-all hover:shadow-sm ${bordure} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${couleur}`}>
          {icone}
        </div>
        {niveau === 'critique' && <AlertCircle size={14} className="text-red-500" />}
        {niveau === 'alerte' && <AlertCircle size={14} className="text-amber-500" />}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-anac-navy">{value}</p>
        <p className="text-xs text-anac-muted mt-0.5">{label}</p>
        {sousLigne && (
          <p
            className={`text-[11px] mt-1 font-medium ${
              niveau === 'critique'
                ? 'text-red-600'
                : niveau === 'alerte'
                  ? 'text-amber-600'
                  : 'text-anac-muted'
            }`}
          >
            {sousLigne}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Badge activité ─────────────────────────────────────────────────────────
function BadgeType({ type }: { type: string }) {
  const config: Record<string, { label: string; classe: string }> = {
    accord: { label: 'Accord', classe: 'badge-actif' },
    courrier: { label: 'Courrier', classe: 'badge-info' },
    mission: { label: 'Mission', classe: 'badge-warning' },
    traduction: { label: 'Traduction', classe: 'badge-expire' },
  };
  const { label, classe } = config[type] ?? { label: type, classe: 'badge-info' };
  return <span className={`${classe} text-[10px]`}>{label}</span>;
}

function BadgeNotificationType({ type }: { type: string }) {
  const config: Record<string, { label: string; classe: string }> = {
    accord_echeance: { label: 'Accord', classe: 'badge-actif' },
    courrier_relance: { label: 'Courrier', classe: 'badge-info' },
    recommandation_rappel: { label: 'Recommandation', classe: 'badge-warning' },
  };
  const { label, classe } = config[type] ?? { label: type, classe: 'badge-info' };
  return <span className={`${classe} text-[10px]`}>{label}</span>;
}

// ── Chart : Traductions par mois ───────────────────────────────────────────
function ChartTraductionsMois({
  data,
}: {
  data: { mois: string; total: number; approuvees: number }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const labels = data.map((d) => {
      const [annee, mois] = d.mois.split('-');
      return new Date(parseInt(annee), parseInt(mois) - 1).toLocaleDateString('fr-FR', {
        month: 'short',
        year: '2-digit',
      });
    });

    // Charger Chart.js dynamiquement
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = () => {
      const Chart = (window as unknown as { Chart: typeof import('chart.js').Chart }).Chart;

      // Détruire l'instance précédente si elle existe
      const existing = Chart.getChart(canvasRef.current!);
      existing?.destroy();

      new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Total',
              data: data.map((d) => d.total),
              backgroundColor: '#2a78d6',
              borderRadius: 4,
            },
            {
              label: 'Approuvées',
              data: data.map((d) => d.approuvees),
              backgroundColor: '#1baf7a',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              ticks: { font: { size: 11 }, color: '#888780' },
              grid: { display: false },
            },
            y: {
              ticks: { font: { size: 11 }, color: '#888780', stepSize: 1 },
              grid: { color: '#e1e0d9' },
              beginAtZero: true,
            },
          },
        },
      });
    };

    if (!(window as unknown as { Chart?: unknown }).Chart) {
      document.head.appendChild(script);
    } else {
      script.onload(new Event('load'));
    }
  }, [data]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <canvas ref={canvasRef} role="img" aria-label="Graphique des traductions par mois" />
    </div>
  );
}

// ── Chart : Demandes par statut ────────────────────────────────────────────
function ChartDemandesStatut({ data }: { data: { statut: string; total: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const LABELS: Record<string, string> = {
    soumise: 'Soumise',
    en_cours: 'En cours',
    en_relecture: 'En relecture',
    validee: 'Validée',
    archivee: 'Archivée',
  };

  const COLORS = ['#2a78d6', '#eda100', '#4a3aa7', '#1baf7a', '#888780'];

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const loadChart = () => {
      const Chart = (window as unknown as { Chart: typeof import('chart.js').Chart }).Chart;
      const existing = Chart.getChart(canvasRef.current!);
      existing?.destroy();

      new Chart(canvasRef.current!, {
        type: 'doughnut',
        data: {
          labels: data.map((d) => LABELS[d.statut] ?? d.statut),
          datasets: [
            {
              data: data.map((d) => d.total),
              backgroundColor: COLORS.slice(0, data.length),
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { font: { size: 11 }, boxWidth: 10, padding: 8 },
            },
          },
          cutout: '65%',
        },
      });
    };

    if ((window as unknown as { Chart?: unknown }).Chart) {
      loadChart();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.onload = loadChart;
      document.head.appendChild(script);
    }
  }, [data]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <canvas ref={canvasRef} role="img" aria-label="Graphique des demandes par statut" />
    </div>
  );
}

// ── Chart : Documents par catégorie ───────────────────────────────────────
function ChartDocumentsCategorie({ data }: { data: { categorie: string; total: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const LABELS: Record<string, string> = {
    accord: 'Accords',
    correspondance: 'Correspondances',
    mission: 'Missions',
    traduction: 'Traductions',
    glossaire: 'Glossaire',
    autre: 'Autres',
  };

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const loadChart = () => {
      const Chart = (window as unknown as { Chart: typeof import('chart.js').Chart }).Chart;
      const existing = Chart.getChart(canvasRef.current!);
      existing?.destroy();

      new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels: data.map((d) => LABELS[d.categorie] ?? d.categorie),
          datasets: [
            {
              label: 'Documents',
              data: data.map((d) => d.total),
              backgroundColor: '#4a3aa7',
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              ticks: { font: { size: 11 }, color: '#888780', stepSize: 1 },
              grid: { color: '#e1e0d9' },
              beginAtZero: true,
            },
            y: {
              ticks: { font: { size: 11 }, color: '#888780' },
              grid: { display: false },
            },
          },
        },
      });
    };

    if ((window as unknown as { Chart?: unknown }).Chart) {
      loadChart();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.onload = loadChart;
      document.head.appendChild(script);
    }
  }, [data]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${Math.max(data.length * 40 + 40, 160)}px`,
      }}
    >
      <canvas ref={canvasRef} role="img" aria-label="Graphique des documents par catégorie" />
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await dashboardApi.getData();
      return res.data as DashboardData;
    },
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  });

  console.log('Dashboard data:', data);

  function formaterDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (!data) return null;

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-anac-navy">Tableau de bord</h2>
        <p className="text-anac-muted text-sm mt-0.5">
          Vue d&apos;ensemble -{' '}
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Accords actifs"
          value={data.kpi.accordsActifs.total}
          icone={<Globe size={16} className="text-blue-600" />}
          couleur="bg-blue-50"
          niveau={
            data.kpi.accordsActifs.critique
              ? 'critique'
              : data.kpi.accordsActifs.enAlerte > 0
                ? 'alerte'
                : 'normal'
          }
          sousLigne={
            data.kpi.accordsActifs.enAlerte > 0
              ? `${data.kpi.accordsActifs.enAlerte} expire${data.kpi.accordsActifs.enAlerte > 1 ? 'nt' : ''} bientôt`
              : undefined
          }
          onClick={() => navigate('/accords')}
        />

        <KpiCard
          label="Courriers sans réponse"
          value={data.kpi.couriersSansReponse.total}
          icone={<Mail size={16} className="text-red-600" />}
          couleur="bg-red-50"
          niveau={
            data.kpi.couriersSansReponse.critique > 0
              ? 'critique'
              : data.kpi.couriersSansReponse.aSurveiller > 0
                ? 'alerte'
                : data.kpi.couriersSansReponse.total > 0
                  ? 'alerte'
                  : 'normal'
          }
          sousLigne={
            data.kpi.couriersSansReponse.critique > 0
              ? `${data.kpi.couriersSansReponse.critique} critique${data.kpi.couriersSansReponse.critique > 1 ? 's' : ''} (90j+)`
              : data.kpi.couriersSansReponse.aSurveiller > 0
                ? `${data.kpi.couriersSansReponse.aSurveiller} à surveiller`
                : undefined
          }
          onClick={() => navigate('/courriers')}
        />

        <KpiCard
          label="Missions en cours"
          value={data.kpi.missionsEnCours.total}
          icone={<TrendingUp size={16} className="text-amber-600" />}
          couleur="bg-amber-50"
          niveau={data.kpi.missionsEnCours.logistiqueNonConfirmee > 0 ? 'critique' : 'normal'}
          sousLigne={
            data.kpi.missionsEnCours.logistiqueNonConfirmee > 0
              ? `${data.kpi.missionsEnCours.logistiqueNonConfirmee} départ${data.kpi.missionsEnCours.logistiqueNonConfirmee > 1 ? 's' : ''} sous 14j sans logistique`
              : undefined
          }
          onClick={() => navigate('/missions')}
        />

        <KpiCard
          label="Traductions à réviser"
          value={data.kpi.traductionsEnAttente}
          icone={<Languages size={16} className="text-violet-600" />}
          couleur="bg-violet-50"
          niveau={data.kpi.traductionsEnAttente > 0 ? 'alerte' : 'normal'}
          onClick={() => navigate('/traductions')}
        />

        <KpiCard
          label="Documents archivés"
          value={data.kpi.documentsArchives}
          icone={<FileText size={16} className="text-teal-600" />}
          couleur="bg-teal-50"
          onClick={() => navigate('/documents')}
        />

        <KpiCard
          label="Termes glossaire"
          value={data.kpi.termesGlossaire}
          icone={<BookOpen size={16} className="text-green-600" />}
          couleur="bg-green-50"
          onClick={() => navigate('/glossaire')}
        />

        <KpiCard
          label="Demandes ouvertes"
          value={data.kpi.demandesOuvertes}
          icone={<Clock size={16} className="text-orange-600" />}
          couleur="bg-orange-50"
          niveau={data.kpi.demandesOuvertes > 0 ? 'alerte' : 'normal'}
          onClick={() => navigate('/demandes')}
        />

        <KpiCard
          label="Recommandations en attente"
          value={data.kpi.recommandationsEnAttente.total}
          icone={<CheckCircle2 size={16} className="text-pink-600" />}
          couleur="bg-pink-50"
          niveau={data.kpi.recommandationsEnAttente.depassees > 0 ? 'critique' : 'normal'}
          sousLigne={
            data.kpi.recommandationsEnAttente.depassees > 0
              ? `${data.kpi.recommandationsEnAttente.depassees} dépassée${data.kpi.recommandationsEnAttente.depassees > 1 ? 's' : ''}`
              : undefined
          }
          onClick={() => navigate('/missions')}
        />
      </div>

      {/* ── Alertes critiques ─────────────────────────────────────────── */}
      {(data.accordsExpirant.length > 0 || data.couriersSansReponse.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Accords expirant */}
          {data.accordsExpirant.length > 0 && (
            <div className="card p-5 border-amber-200 bg-amber-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-anac-navy flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  Accords expirant sous 90j
                </h3>
                <button
                  onClick={() => navigate('/accords')}
                  className="text-xs text-anac-sky hover:text-anac-navy flex items-center gap-1"
                >
                  Voir tout <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-2">
                {data.accordsExpirant.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/accords/${a.id}`)}
                    className="w-full text-left flex items-center justify-between py-2 border-b border-amber-100 last:border-0 hover:opacity-80"
                  >
                    <div>
                      <p className="text-xs font-medium text-anac-navy truncate max-w-[200px]">
                        {a.titre}
                      </p>
                      <p className="text-[11px] font-mono text-anac-muted">{a.reference}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        a.joursRestants <= 30 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {a.joursRestants}j
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Courriers sans réponse */}
          {data.couriersSansReponse.length > 0 && (
            <div className="card p-5 border-red-200 bg-red-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-anac-navy flex items-center gap-2">
                  <Mail size={14} className="text-red-500" />
                  Courriers sans réponse
                </h3>
                <button
                  onClick={() => navigate('/courriers')}
                  className="text-xs text-anac-sky hover:text-anac-navy flex items-center gap-1"
                >
                  Voir tout <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-2">
                {data.couriersSansReponse.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/courriers/${c.id}`)}
                    className="w-full text-left flex items-center justify-between py-2 border-b border-red-100 last:border-0 hover:opacity-80"
                  >
                    <div>
                      <p className="text-xs font-medium text-anac-navy truncate max-w-[200px]">
                        {c.objet}
                      </p>
                      <p className="text-[11px] font-mono text-anac-muted">{c.reference}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        c.joursAttente > 7 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {c.joursAttente}j
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Graphiques ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Traductions par mois */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-anac-navy">Traductions - 6 derniers mois</h3>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="flex items-center gap-1.5 text-[11px] text-anac-muted">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: '#2a78d6' }}
              ></span>
              Total
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-anac-muted">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: '#1baf7a' }}
              ></span>
              Approuvées
            </span>
          </div>
          {data.traductionsParMois.length > 0 ? (
            <ChartTraductionsMois data={data.traductionsParMois} />
          ) : (
            <div className="h-48 flex items-center justify-center text-anac-muted text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Demandes par statut */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-anac-navy mb-3">Demandes par statut</h3>
          {data.demandesParStatut.length > 0 ? (
            <ChartDemandesStatut data={data.demandesParStatut} />
          ) : (
            <div className="h-48 flex items-center justify-center text-anac-muted text-sm">
              Aucune demande enregistrée
            </div>
          )}
        </div>
      </div>

      {/* Documents par catégorie */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-anac-navy mb-3">
          Documents archivés par catégorie
        </h3>
        {data.documentsParCategorie.length > 0 ? (
          <ChartDocumentsCategorie data={data.documentsParCategorie} />
        ) : (
          <div className="h-32 flex items-center justify-center text-anac-muted text-sm">
            Aucun document archivé
          </div>
        )}
      </div>

      {/* ── Recommandations en attente ────────────────────────────────── */}
      {data.recommandationsEnAttente.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-anac-navy">Recommandations en attente</h3>
            <button
              onClick={() => navigate('/missions')}
              className="text-xs text-anac-sky hover:text-anac-navy flex items-center gap-1"
            >
              Voir missions <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {data.recommandationsEnAttente.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/missions/${r.missionId}`)}
                className={`w-full text-left flex items-start justify-between p-3 rounded-lg border transition-colors hover:bg-anac-gray/40 ${
                  r.depasse ? 'border-red-200 bg-red-50/30' : 'border-anac-border'
                }`}
              >
                <p className="text-xs text-anac-navy leading-relaxed max-w-lg">
                  {r.texte.length > 100 ? r.texte.slice(0, 100) + '...' : r.texte}
                </p>
                {r.dateLimite && (
                  <span
                    className={`text-[11px] font-medium shrink-0 ml-3 ${
                      r.depasse ? 'text-red-600' : 'text-anac-muted'
                    }`}
                  >
                    {r.depasse ? '⚠ ' : ''}
                    {formaterDate(r.dateLimite)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Notifications envoyées récemment ───────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-anac-navy flex items-center gap-2">
              <Send size={14} className="text-anac-sky" />
              Notifications envoyées récemment
            </h3>
          </div>

          {data.notificationsRecentes.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-6">
              Aucune relance envoyée pour le moment.
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-anac-border/50">
              {data.notificationsRecentes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    const route =
                      n.type === 'accord_echeance'
                        ? `/accords/${n.entiteId}`
                        : n.type === 'courrier_relance'
                          ? `/courriers/${n.entiteId}`
                          : n.type === 'recommandation_rappel'
                            ? `/missions`
                            : '/dashboard';
                    navigate(route);
                  }}
                  className="w-full text-left flex items-center gap-3 py-2.5 hover:bg-anac-gray/30 transition-colors rounded px-1 -mx-1"
                >
                  <BadgeNotificationType type={n.type} />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-anac-navy truncate">
                      {n.destinataireNom ?? n.destinataireEmail}
                    </p>
                    <p className="text-[11px] text-anac-muted">par {n.declencheParNom ?? 'CCIT'}</p>
                  </div>

                  {n.statut === 'echec' && (
                    <span className="text-[10px] text-red-600 font-medium shrink-0">échec</span>
                  )}

                  <span className="text-[11px] text-anac-muted shrink-0">
                    {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Activité récente ──────────────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-anac-navy mb-3">Activité récente</h3>
          {data.activiteRecente.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-6">Aucune activité récente.</p>
          ) : (
            <div className="space-y-0 divide-y divide-anac-border/50">
              {data.activiteRecente.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <BadgeType type={a.type} />
                  <span className="font-mono text-[11px] text-anac-muted shrink-0">
                    {a.reference}
                  </span>
                  <span className="text-xs text-anac-navy truncate flex-1">{a.label}</span>
                  <span className="text-[11px] text-anac-muted shrink-0">
                    {formaterDate(a.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
