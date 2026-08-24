import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourrierDirection } from '../courrier.types';
import { COURRIER_DIRECTION_LABELS } from '../courrier.constants';

const DIRECTION_CLASSES: Record<CourrierDirection, string> = {
  entrant: 'border-blue-200 bg-blue-50 text-anac-blue',
  sortant: 'border-violet-200 bg-violet-50 text-violet-700',
};

export function CourrierDirectionBadge({ direction }: { direction: CourrierDirection }) {
  const Icon = direction === 'entrant' ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold',
        DIRECTION_CLASSES[direction]
      )}
    >
      <Icon size={11} aria-hidden="true" />
      {COURRIER_DIRECTION_LABELS[direction]}
    </span>
  );
}
