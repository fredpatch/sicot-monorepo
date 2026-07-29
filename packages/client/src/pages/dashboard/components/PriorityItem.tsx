import { AlertTriangle, ArrowRight, CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import type { PriorityItem as PriorityItemType } from '../dashboard.types';

export function PriorityItem({ item }: { item: PriorityItemType }) {
  const isCritical = item.severity === 'critical';

  return (
    <Link
      to={item.href}
      className="grid gap-3 border-b border-anac-border px-3 py-3 outline-none transition-colors last:border-b-0 hover:bg-anac-gray/60 focus-visible:ring-2 focus-visible:ring-anac-sky sm:grid-cols-[2rem_1fr_auto_11rem_1rem] sm:items-center"
      aria-label={`${item.entityType} ${item.reference}: ${item.nextAction}`}
    >
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-full border',
          isCritical
            ? 'border-red-200 bg-red-50 text-anac-danger'
            : 'border-amber-200 bg-amber-50 text-anac-warning'
        )}
      >
        {isCritical ? <CircleAlert size={16} /> : <AlertTriangle size={16} />}
      </span>

      <span className="min-w-0">
        <span className="block font-semibold text-anac-navy">
          {item.entityType} {item.reference}
        </span>
        <span className="block truncate text-xs text-anac-muted">{item.title}</span>
      </span>

      <span
        className={cn(
          'w-fit rounded border px-2 py-1 text-xs font-semibold',
          isCritical
            ? 'border-red-200 bg-red-50 text-anac-danger'
            : 'border-amber-200 bg-amber-50 text-anac-warning'
        )}
      >
        {item.timing}
      </span>

      <span className="text-xs font-medium text-anac-blue sm:text-right">{item.nextAction}</span>
      <ArrowRight size={15} className="hidden text-anac-blue sm:block" aria-hidden="true" />
    </Link>
  );
}
