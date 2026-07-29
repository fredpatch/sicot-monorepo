import { RefreshCw, CalendarDays, Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatFullDate, formatTime } from '../dashboard.utils';

export function DashboardHeader({
  firstName,
  updatedAt,
  refreshing,
  onRefresh,
}: {
  firstName?: string;
  updatedAt: Date;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-2xl font-bold leading-tight text-anac-navy">Tableau de bord</h2>
        <p className="mt-1 text-sm text-anac-muted">
          Bonjour, {firstName || 'utilisateur'} - voici les éléments nécessitant votre attention.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-anac-muted">
        <span className="inline-flex items-center gap-2">
          <Clock3 size={14} aria-hidden="true" />
          Dernière actualisation : {formatTime(updatedAt)}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarDays size={14} aria-hidden="true" />
          {formatFullDate(new Date())}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Actualiser le tableau de bord"
          className="h-8 border-anac-border bg-white text-anac-navy hover:bg-anac-gray"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Actualiser
        </Button>
      </div>
    </div>
  );
}
