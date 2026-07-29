import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Tone = 'blue' | 'red' | 'amber' | 'green';

const toneClasses: Record<Tone, { icon: string; text: string }> = {
  blue: { icon: 'bg-blue-50 text-anac-blue', text: 'text-anac-blue' },
  red: { icon: 'bg-red-50 text-anac-danger', text: 'text-anac-danger' },
  amber: { icon: 'bg-amber-50 text-anac-warning', text: 'text-anac-warning' },
  green: { icon: 'bg-green-50 text-anac-success', text: 'text-anac-success' },
};

export function OperationalKpiCard({
  label,
  value,
  helper,
  href,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: number;
  helper?: string;
  href: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const content = (
    <span className="flex h-full items-center gap-4">
      <span
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-full',
          toneClasses[tone].icon
        )}
      >
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-anac-navy">{label}</span>
        <span className="mt-1 block text-2xl font-bold tabular-nums text-anac-navy">{value}</span>
        {helper && (
          <span className={cn('mt-1 block text-xs font-medium', toneClasses[tone].text)}>
            {helper}
          </span>
        )}
      </span>
    </span>
  );

  return (
    <Link
      to={href}
      className="card block min-h-[100px] p-4 outline-none transition-colors hover:border-anac-sky focus-visible:ring-2 focus-visible:ring-anac-sky"
      aria-label={`${label}: ${value}${helper ? `. ${helper}` : ''}`}
    >
      {content}
    </Link>
  );
}
