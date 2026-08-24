import type { MissionStatut } from '@/lib/missions.api';
import { cn } from '@/lib/utils';
import { MISSION_STATUS_LABELS } from '../mission.constants';

const STATUS_CLASSES: Record<MissionStatut, string> = {
  planifiee: 'border-blue-200 bg-blue-50 text-anac-blue',
  en_cours: 'border-amber-200 bg-amber-50 text-anac-warning',
  terminee: 'border-green-200 bg-green-50 text-green-700',
  annulee: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function MissionStatusBadge({ statut }: { statut: MissionStatut }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[statut]
      )}
    >
      {MISSION_STATUS_LABELS[statut]}
    </span>
  );
}
