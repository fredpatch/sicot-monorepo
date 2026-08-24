import { cn } from '@/lib/utils';
import type { CourrierSuiviStatut } from '../courrier.types';
import { COURRIER_STATUS_LABELS } from '../courrier.constants';

const STATUS_CLASSES: Record<CourrierSuiviStatut, string> = {
  en_attente: 'border-amber-200 bg-amber-50 text-anac-warning',
  repondu: 'border-green-200 bg-green-50 text-green-700',
  archive: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function CourrierStatusBadge({ statut }: { statut: CourrierSuiviStatut }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[statut]
      )}
    >
      {COURRIER_STATUS_LABELS[statut]}
    </span>
  );
}
