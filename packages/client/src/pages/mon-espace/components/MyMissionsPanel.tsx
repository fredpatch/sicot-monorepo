// packages/client/src/pages/mon-espace/components/MyMissionsPanel.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { missionsApi } from '@/lib/missions.api';
import { QuickUploadDialog, type UploadedDocument } from '@/components/documents/QuickUploadDialog';
import { MissionStatusBadge } from '@/pages/missions/components/MissionStatusBadge';
import { formatMissionDate } from '@/pages/missions/mission.utils';
import type { Mission, MissionListResponse } from '@/pages/missions/mission.types';

export function MyMissionsPanel({ participantId }: { participantId: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [missionUpload, setMissionUpload] = useState<Mission | null>(null);

  const missionsQuery = useQuery({
    queryKey: ['missions', { participantId, pageSize: 5 }],
    queryFn: async () => {
      const res = await missionsApi.lister({ participantId, pageSize: 4 });
      return res.data as MissionListResponse;
    },
  });

  const linkReportMutation = useMutation({
    mutationFn: ({ missionId, documentId }: { missionId: number; documentId: number }) =>
      missionsApi.mettreAJour(missionId, { rapportDocumentId: documentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions-aggregates'] });
    },
  });

  function handleUploaded(document: UploadedDocument) {
    if (missionUpload)
      linkReportMutation.mutate({ missionId: missionUpload.id, documentId: document.id });
    setMissionUpload(null);
  }

  const missions = missionsQuery.data?.data ?? [];

  return (
    <section className="card p-0">
      <div className="flex items-center justify-between gap-3 border-b border-anac-border p-4">
        <h3 className="text-base font-bold text-anac-navy">Mes missions</h3>
        <button
          type="button"
          onClick={() => navigate('/mes-missions')}
          className="flex items-center gap-1 text-xs font-medium text-anac-blue hover:text-anac-navy"
        >
          Voir toutes <ArrowRight size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="divide-y divide-anac-border">
        {missionsQuery.isLoading ? (
          <div className="flex min-h-32 items-center justify-center p-4 text-anac-muted">
            <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
            Chargement...
          </div>
        ) : missions.length === 0 ? (
          <p className="p-4 py-8 text-center text-sm text-anac-muted">
            Aucune mission pour le moment.
          </p>
        ) : (
          missions.map((mission) => (
            <div key={mission.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-anac-navy">{mission.titre}</p>
                  <p className="mt-0.5 text-xs text-anac-muted">
                    {mission.destination} - {formatMissionDate(mission.dateDebut)}
                  </p>
                </div>
                <MissionStatusBadge statut={mission.statut} />
              </div>

              <div className="mt-3">
                {mission.rapportDocumentId ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-anac-success">
                    <CheckCircle2 size={13} aria-hidden="true" /> Rapport déposé
                  </span>
                ) : mission.statut === 'terminee' ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setMissionUpload(mission)}
                    disabled={linkReportMutation.isPending}
                    className="h-auto gap-1.5 p-0 text-xs text-anac-warning hover:text-anac-danger"
                  >
                    <Upload size={12} aria-hidden="true" /> Rapport à déposer
                  </Button>
                ) : (
                  <span className="text-xs text-anac-muted">Mission non terminée</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {missions.length > 0 && (
        <div className="border-t border-anac-border p-4 text-center">
          <Link
            to="/mes-missions"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue hover:text-anac-navy"
          >
            Voir toutes mes missions <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      )}

      <QuickUploadDialog
        open={!!missionUpload}
        onOpenChange={(open) => !open && setMissionUpload(null)}
        title="Déposer le rapport de mission"
        description={missionUpload ? `Rapport pour « ${missionUpload.titre} ».` : ''}
        categorie="mission"
        onUploaded={handleUploaded}
      />
    </section>
  );
}
