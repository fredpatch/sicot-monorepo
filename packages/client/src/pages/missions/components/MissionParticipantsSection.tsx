import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Users } from 'lucide-react';

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
import { useAuth } from '@/App';
import type { Mission } from '../mission.types';
import { canManageMission } from '../missions.permissions';
import { ParticipantsPicker } from './ParticipantsPicker';

export function MissionParticipantsSection({ mission }: { mission: Mission }) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const peutGerer = canManageMission(user);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-anac-navy">Participants ({mission.participants.length})</h3>
        {peutGerer && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={mission.statut === 'annulee'}
            className="gap-1.5"
          >
            <Pencil size={13} aria-hidden="true" />
            Modifier les participants
          </Button>
        )}
      </div>

      {mission.participants.length === 0 ? (
        <p className="mt-4 text-sm text-anac-muted">Aucun participant.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {mission.participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3 rounded-md border border-anac-border p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-anac-blue">
                <Users size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-anac-navy">
                  {participant.prenom} {participant.nom}
                </span>
                <span className="text-xs text-anac-muted">
                  {participant.matricule}
                  {participant.email ? ` · ${participant.email}` : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <EditParticipantsDialog mission={mission} open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}

function EditParticipantsDialog({
  mission,
  open,
  onOpenChange,
}: {
  mission: Mission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<number[]>(mission.participants.map((p) => p.id));

  const mutation = useMutation({
    mutationFn: () => missionsApi.mettreAJour(mission.id, { participantsIds: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', mission.id] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setValue(mission.participants.map((p) => p.id));
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier les participants</DialogTitle>
          <DialogDescription>{mission.titre}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ParticipantsPicker value={value} onChange={setValue} />
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
