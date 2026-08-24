import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourrierHealth } from '../courrier.utils';

const TONE_CLASSES: Record<CourrierHealth['tone'], string> = {
  critical: 'border-red-200 bg-red-50 text-anac-danger',
  warning: 'border-amber-200 bg-amber-50 text-anac-warning',
  normal: 'border-green-200 bg-green-50 text-green-700',
  muted: 'border-slate-200 bg-slate-50 text-slate-600',
};

// Text always carries the meaning (label) — icon+color only reinforce,
// never the sole signal.
export function CourrierHealthBadge({ health }: { health: CourrierHealth }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold',
        TONE_CLASSES[health.tone]
      )}
    >
      {(health.tone === 'critical' || health.tone === 'warning') && (
        <AlertTriangle size={11} aria-hidden="true" />
      )}
      {health.label}
    </span>
  );
}
