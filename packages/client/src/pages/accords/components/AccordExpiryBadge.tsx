import { cn } from '@/lib/utils';
import type { Accord } from '../accord.types';
import { formatAccordDate, formatExpiryLabel, getExpiryTone } from '../accord.utils';

export function AccordExpiryBadge({
  accord,
  showDate = true,
}: {
  accord: Pick<Accord, 'dateExpiration' | 'statut'>;
  showDate?: boolean;
}) {
  const tone = getExpiryTone(accord);

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className={cn(
          'w-fit rounded border px-2 py-0.5 text-xs font-semibold',
          tone === 'critical' && 'border-red-200 bg-red-50 text-anac-danger',
          tone === 'warning' && 'border-amber-200 bg-amber-50 text-anac-warning',
          tone === 'normal' && 'border-anac-border bg-white text-anac-muted'
        )}
      >
        {formatExpiryLabel(accord)}
      </span>
      {showDate && accord.dateExpiration && (
        <span className="text-[11px] text-anac-muted">{formatAccordDate(accord.dateExpiration)}</span>
      )}
    </span>
  );
}

