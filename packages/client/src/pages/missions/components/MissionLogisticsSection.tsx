import { useState } from 'react';
import { CheckCircle2, Circle, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LOGISTIQUE_CHECKLIST_ITEMS } from '../mission.constants';
import type { Mission } from '../mission.types';
import { daysUntilMissionStart, isMissionLogisticsAtRisk } from '../mission.utils';
import { LogisticsDialog } from './LogisticsDialog';
import { MissionLogisticsBadge } from './MissionLogisticsBadge';

export function MissionLogisticsSection({ mission }: { mission: Mission }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const atRisk = isMissionLogisticsAtRisk(mission);
  const days = daysUntilMissionStart(mission);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-anac-navy">Logistique</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={mission.statut === 'annulee'}
          className="gap-1.5"
        >
          <Truck size={13} aria-hidden="true" />
          Mettre à jour la logistique
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <MissionLogisticsBadge statut={mission.confirmationLogistique} />
        {mission.contactSurPlace && (
          <span className="text-sm text-anac-muted">
            Contact : {mission.contactSurPlace.prenom} {mission.contactSurPlace.nom}
          </span>
        )}
      </div>

      {/* Always visible, read-only - the checklist that drives the status
          above stays legible without opening the edit dialog, even once
          the mission is confirmée. Editing still only happens through
          "Mettre à jour la logistique". */}
      <ul className="mt-4 space-y-2">
        {LOGISTIQUE_CHECKLIST_ITEMS.map((item) => {
          const checked = mission[item.key];
          return (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {checked ? (
                <CheckCircle2 size={15} className="shrink-0 text-anac-success" aria-hidden="true" />
              ) : (
                <Circle size={15} className="shrink-0 text-anac-muted" aria-hidden="true" />
              )}
              <span className={checked ? 'text-anac-navy' : 'text-anac-muted'}>{item.label}</span>
            </li>
          );
        })}
      </ul>

      {atRisk && days !== null && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-anac-danger">
          {days <= 0
            ? "Départ imminent - la logistique n'est pas encore confirmée."
            : `Départ dans ${days} jour${days > 1 ? 's' : ''}. La logistique n'est pas encore confirmée.`}
        </div>
      )}

      <LogisticsDialog mission={mission} open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}
