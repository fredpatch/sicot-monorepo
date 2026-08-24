import type { LogistiqueStatut } from '@/lib/missions.api';
import { cn } from '@/lib/utils';
import { LOGISTIQUE_STATUS_LABELS } from '../mission.constants';

const LOGISTIQUE_CLASSES: Record<LogistiqueStatut, string> = {
  a_planifier: 'border-slate-200 bg-slate-50 text-slate-700',
  en_cours: 'border-amber-200 bg-amber-50 text-anac-warning',
  confirme: 'border-green-200 bg-green-50 text-green-700',
};

export function MissionLogisticsBadge({ statut }: { statut: LogistiqueStatut }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold',
        LOGISTIQUE_CLASSES[statut]
      )}
    >
      {LOGISTIQUE_STATUS_LABELS[statut]}
    </span>
  );
}
