// packages/client/src/pages/demandes/components/PriorityBadge.tsx
import { AlertCircle } from 'lucide-react';
import type { DemandePriorite } from '@/lib/demandes.api';
import type { Demande } from '../requests.types';

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

/** Effective priority + a note when the reviewer overrode the requested value. */
export function RequestPriorityCell({ demande }: { demande: Demande }) {
  const active = demande.prioriteValidee ?? demande.prioriteDemandee;
  return (
    <>
      <BadgePriorite priorite={active} />
      {demande.prioriteValidee && demande.prioriteValidee !== demande.prioriteDemandee && (
        <div className="mt-0.5 text-[10px] text-anac-muted">
          Demandée : {demande.prioriteDemandee === 'urgente' ? 'Urgente' : 'Normale'}
        </div>
      )}
    </>
  );
}
