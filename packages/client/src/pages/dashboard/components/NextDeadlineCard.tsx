import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { DeadlineItem } from '../dashboard.types';
import { formatDate } from '../dashboard.utils';

export function NextDeadlineCard({ deadline }: { deadline: DeadlineItem | null }) {
  return (
    <section className="card p-4" aria-labelledby="dashboard-deadline-title">
      <h3 id="dashboard-deadline-title" className="mb-4 text-base font-bold text-anac-navy">
        Prochaine échéance
      </h3>
      {deadline ? (
        <Link
          to={deadline.href}
          className="flex items-center justify-between gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          aria-label={`${deadline.label} ${deadline.title}, échéance ${formatDate(deadline.date)}`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-anac-blue text-white">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-anac-navy">{deadline.title}</span>
              <span className="block text-xs text-anac-muted">{formatDate(deadline.date)}</span>
            </span>
          </span>
          <span className="rounded-md border border-blue-100 bg-blue-50 px-5 py-3 text-2xl font-bold text-anac-blue">
            {deadline.countdown}
          </span>
        </Link>
      ) : (
        <p className="py-6 text-center text-sm text-anac-muted">Aucune échéance à venir.</p>
      )}
    </section>
  );
}
