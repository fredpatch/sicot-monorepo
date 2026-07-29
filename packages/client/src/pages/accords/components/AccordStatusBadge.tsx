import type { AccordStatut } from '@/lib/accords.api';
import { cn } from '@/lib/utils';
import { getStatusLabel } from '../accord.utils';

const STATUS_CLASSES: Record<AccordStatut, string> = {
  actif: 'border-green-200 bg-green-50 text-green-700',
  expire: 'border-red-200 bg-red-50 text-anac-danger',
  suspendu: 'border-slate-200 bg-slate-50 text-slate-700',
  en_renouvellement: 'border-amber-200 bg-amber-50 text-anac-warning',
};

export function AccordStatusBadge({ statut }: { statut: AccordStatut }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[statut]
      )}
    >
      {getStatusLabel(statut)}
    </span>
  );
}

