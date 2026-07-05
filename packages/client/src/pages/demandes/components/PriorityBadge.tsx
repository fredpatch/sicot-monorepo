// packages/client/src/pages/demandes/components/BadgePriorite.tsx
import { AlertCircle } from 'lucide-react';
import type { DemandePriorite } from '@/lib/demandes.api';

export function BadgePriorite({ priorite }: { priorite: DemandePriorite }) {
  if (priorite === 'urgente') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 rounded px-1.5 py-0.5">
        <AlertCircle size={10} /> Urgente
      </span>
    );
  }
  return <span className="text-[11px] text-anac-muted">Normale</span>;
}
