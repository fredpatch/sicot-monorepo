import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MissionHealth } from '../mission.utils';

const TONE_CLASSES: Record<MissionHealth['tone'], string> = {
  critical: 'border-red-200 bg-red-50 text-anac-danger',
  warning: 'border-amber-200 bg-amber-50 text-anac-warning',
  normal: 'border-green-200 bg-green-50 text-green-700',
};

// Text always carries the meaning (label), icon+color only reinforce -
// never the sole signal, per the accessibility requirement.
export function MissionHealthBadge({ health }: { health: MissionHealth }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold',
        TONE_CLASSES[health.tone]
      )}
      title={health.helper}
    >
      <AlertTriangle size={11} aria-hidden="true" />
      {health.label}
    </span>
  );
}
