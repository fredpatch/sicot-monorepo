import { Link } from 'react-router-dom';

import type { PriorityItem as PriorityItemType } from '../dashboard.types';
import { PriorityItem } from './PriorityItem';

export function PrioritySection({ priorities }: { priorities: PriorityItemType[] }) {
  const visible = priorities.slice(0, 5);
  const criticalCount = priorities.filter((item) => item.severity === 'critical').length;

  return (
    <section className="card p-0 lg:col-span-8" aria-labelledby="dashboard-priorities-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-anac-border px-5 py-4">
        <div className="flex items-center gap-3">
          <h3 id="dashboard-priorities-title" className="text-base font-bold text-anac-navy">
            Priorités du jour
          </h3>
          {priorities.length > 0 && (
            <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-anac-danger">
              {criticalCount} élément{criticalCount > 1 ? 's' : ''} critique
              {criticalCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {visible.length > 0 ? (
        <div>
          {visible.map((item) => (
            <PriorityItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-anac-muted">
          Aucun élément critique ou à surveiller pour le moment.
        </div>
      )}

      <div className="border-t border-anac-border px-5 py-3 text-center">
        <Link
          to="/analytics"
          className="text-sm font-semibold text-anac-blue outline-none hover:text-anac-navy focus-visible:ring-2 focus-visible:ring-anac-sky"
        >
          Voir toutes les priorités
        </Link>
      </div>
    </section>
  );
}
