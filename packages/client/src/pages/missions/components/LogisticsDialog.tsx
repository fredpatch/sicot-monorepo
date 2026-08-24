import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { missionsApi } from '@/lib/missions.api';
import { LOGISTIQUE_CHECKLIST_ITEMS } from '../mission.constants';
import type { Mission } from '../mission.types';
import { MissionLogisticsBadge } from './MissionLogisticsBadge';

type ChecklistState = Record<
  'logistiqueBilletReserve' | 'logistiqueHebergementConfirme' | 'logistiqueFinancementValide',
  boolean
>;

function deriveStatut(state: ChecklistState) {
  const values = Object.values(state);
  if (values.every(Boolean)) return 'confirme' as const;
  if (values.every((v) => !v)) return 'a_planifier' as const;
  return 'en_cours' as const;
}

// Logistics status is derived from this checklist, not manually picked —
// see the server's mettreAJourMission. Checking/unchecking items updates
// the derived status live in the dialog before saving.
export function LogisticsDialog({
  mission,
  open,
  onOpenChange,
}: {
  mission: Mission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ChecklistState>({
    logistiqueBilletReserve: mission.logistiqueBilletReserve,
    logistiqueHebergementConfirme: mission.logistiqueHebergementConfirme,
    logistiqueFinancementValide: mission.logistiqueFinancementValide,
  });

  const mutation = useMutation({
    mutationFn: () => missionsApi.mettreAJour(mission.id, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', mission.id] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
      onOpenChange(false);
    },
  });

  const derived = deriveStatut(state);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setState({
            logistiqueBilletReserve: mission.logistiqueBilletReserve,
            logistiqueHebergementConfirme: mission.logistiqueHebergementConfirme,
            logistiqueFinancementValide: mission.logistiqueFinancementValide,
          });
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-anac-blue">
              <Truck size={18} aria-hidden="true" />
            </span>
            <span>
              <DialogTitle className="text-base">Mettre à jour la logistique</DialogTitle>
              <DialogDescription>{mission.titre}</DialogDescription>
            </span>
          </div>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            {LOGISTIQUE_CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-anac-border px-4 py-3 hover:bg-anac-gray"
              >
                <input
                  type="checkbox"
                  checked={state[item.key]}
                  onChange={(event) => setState((prev) => ({ ...prev, [item.key]: event.target.checked }))}
                  className="size-4 rounded border-anac-border text-anac-blue focus:ring-anac-sky"
                />
                <span className="text-sm font-medium text-anac-navy">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-md border border-anac-border bg-anac-gray px-4 py-3">
            <span className="text-sm text-anac-muted">Statut logistique</span>
            <MissionLogisticsBadge statut={derived} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2 bg-anac-blue">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
