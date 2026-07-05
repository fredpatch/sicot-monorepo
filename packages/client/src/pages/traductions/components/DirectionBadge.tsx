// packages/client/src/pages/traductions/components/BadgeDirection.tsx
import { Languages } from 'lucide-react';
import type { TraductionDirection } from '@/lib/traductions.api';

export function BadgeDirection({ direction }: { direction: TraductionDirection }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-anac-muted bg-anac-gray rounded px-1.5 py-0.5">
      <Languages size={10} />
      {direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
    </span>
  );
}
