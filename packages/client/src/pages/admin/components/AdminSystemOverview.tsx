// packages/client/src/pages/admin/components/AdminSystemOverview.tsx
import { Layers, ListChecks, Sparkles, Languages } from 'lucide-react';
import type { StatutMoteurTraduction, StatutGemini } from '../admin.types';

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value?: string | number;
  helper: string;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-anac-blue border-blue-100',
    green: 'bg-green-50 text-anac-success border-green-100',
    amber: 'bg-amber-50 text-anac-warning border-amber-100',
    red: 'bg-red-50 text-anac-danger border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }[tone];

  return (
    <div className="card flex min-h-[92px] items-start justify-between p-4">
      <div>
        <p className="text-xs font-medium text-anac-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-anac-navy">
          {value === undefined ? '-' : value}
        </p>
        <p className="mt-1 text-xs text-anac-muted">{helper}</p>
      </div>
      <span className={`rounded-md border p-2 ${toneClasses}`}>{icon}</span>
    </div>
  );
}

interface AdminSystemOverviewProps {
  parametresCount?: number;
  jobsCount?: number;
  moteurStatus?: StatutMoteurTraduction;
  geminiUsage?: StatutGemini;
}

// Uniquement des métriques réelles, dérivées de tableaux complets déjà
// chargés (pas de pagination à contourner) - pas de « score de santé »
// fabriqué, pas de compteur de succès/24h inventé (Phase 1 audit §35).
export function AdminSystemOverview({
  parametresCount,
  jobsCount,
  moteurStatus,
  geminiUsage,
}: AdminSystemOverviewProps) {
  const rapportsIA = geminiUsage?.rapportsIA;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Paramètres configurables"
        value={parametresCount}
        helper="Tous modules confondus"
        icon={<Layers size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="Jobs manuels disponibles"
        value={jobsCount}
        helper="Déclenchables depuis cette console"
        icon={<ListChecks size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="Moteur de traduction"
        value={
          moteurStatus === undefined
            ? undefined
            : moteurStatus.accessible
              ? 'Opérationnel'
              : 'Indisponible'
        }
        helper={
          moteurStatus?.deeplConfigure ? 'Fallback DeepL configuré' : 'Fallback DeepL non configuré'
        }
        icon={<Languages size={16} aria-hidden="true" />}
        tone={moteurStatus === undefined ? 'slate' : moteurStatus.accessible ? 'green' : 'red'}
      />
      <SummaryCard
        label="Rapports IA aujourd'hui"
        value={rapportsIA === undefined ? undefined : `${rapportsIA.utilises} / ${rapportsIA.max}`}
        helper="Générés à la demande, tous utilisateurs"
        icon={<Sparkles size={16} aria-hidden="true" />}
        tone="amber"
      />
    </section>
  );
}
