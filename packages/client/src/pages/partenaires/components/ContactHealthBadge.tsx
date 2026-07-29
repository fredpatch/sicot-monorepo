import type { Organisation } from '../partenaires.types';
import { getContactHealth } from '../partenaires.utils';

export function ContactHealthBadge({ organisation }: { organisation: Organisation }) {
  const health = getContactHealth(organisation);
  const className = {
    green: 'border-green-200 bg-green-50 text-anac-success',
    amber: 'border-amber-200 bg-amber-50 text-anac-warning',
    red: 'border-red-200 bg-red-50 text-anac-danger',
  }[health.tone];

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${className}`}>
      {health.label}
    </span>
  );
}
