import { cn } from '@/lib/utils';

export function GlossaryStatusBadge({ actif }: { actif: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        actif ? 'bg-green-50 text-anac-success' : 'bg-red-50 text-anac-danger'
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', actif ? 'bg-anac-success' : 'bg-anac-danger')}
        aria-hidden="true"
      />
      {actif ? 'Actif' : 'Inactif'}
    </span>
  );
}
