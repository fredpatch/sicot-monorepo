// packages/client/src/pages/MesMissionsPage.tsx
//
// Agent-restricted mission view - their own missions (participantId scope)
// with the existing report upload/link flow, no planning/admin actions.
// Deliberately not the full /missions registry (which stays admin-gated).
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { missionsApi } from '@/lib/missions.api';
import { QuickUploadDialog, type UploadedDocument } from '@/components/documents/QuickUploadDialog';
import { MissionStatusBadge } from './missions/components/MissionStatusBadge';
import { formatMissionPeriod } from './missions/mission.utils';
import type { Mission, MissionListResponse } from './missions/mission.types';

const PAGE_SIZE = 10;

export default function MesMissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [missionUpload, setMissionUpload] = useState<Mission | null>(null);

  const missionsQuery = useQuery({
    queryKey: ['missions', { participantId: user?.id, page, pageSize: PAGE_SIZE }],
    queryFn: async () => {
      const res = await missionsApi.lister({ participantId: user!.id, page, pageSize: PAGE_SIZE });
      return res.data as MissionListResponse;
    },
    enabled: !!user,
  });

  const linkReportMutation = useMutation({
    mutationFn: ({ missionId, documentId }: { missionId: number; documentId: number }) =>
      missionsApi.definirRapportPersonnel(missionId, documentId),
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

  if (!user) return null;

  const missions = missionsQuery.data?.data ?? [];
  const totalPages = missionsQuery.data ? Math.ceil(missionsQuery.data.total / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header>
        <h2 className="text-2xl font-bold leading-tight text-anac-navy">Mes missions</h2>
        <p className="mt-1 text-sm text-anac-muted">
          Missions auxquelles vous participez, et dépôt de vos rapports de mission.
        </p>
      </header>

      {missionsQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement de vos missions...
        </div>
      ) : missions.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">Aucune mission pour le moment.</p>
          <p className="text-sm text-anac-muted">
            Vos missions apparaîtront ici une fois assignées.
          </p>
        </div>
      ) : (
        <div className="card hidden overflow-hidden p-0 md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
              <tr>
                <th className="px-4 py-3">Mission</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Rapport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-anac-border">
              {missions.map((mission) => (
                <tr key={mission.id}>
                  <td className="px-4 py-3 align-top font-medium text-anac-navy">
                    {mission.titre}
                  </td>
                  <td className="px-4 py-3 align-top text-anac-muted">{mission.destination}</td>
                  <td className="px-4 py-3 align-top text-xs text-anac-muted">
                    {formatMissionPeriod(mission)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <MissionStatusBadge statut={mission.statut} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    {mission.rapportDocumentId ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-anac-success">
                        <CheckCircle2 size={13} aria-hidden="true" /> Déposé
                      </span>
                    ) : mission.statut === 'terminee' &&
                      mission.rapportResponsableId === user.id ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setMissionUpload(mission)}
                        disabled={linkReportMutation.isPending}
                        className="h-auto gap-1.5 p-0 text-xs text-anac-warning hover:text-anac-danger"
                      >
                        <Upload size={12} aria-hidden="true" /> Déposer
                      </Button>
                    ) : (
                      <span className="text-xs text-anac-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {missions.map((mission) => (
          <div key={mission.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-anac-navy">{mission.titre}</p>
                <p className="mt-0.5 text-xs text-anac-muted">{mission.destination}</p>
              </div>
              <MissionStatusBadge statut={mission.statut} />
            </div>
            <p className="mt-2 text-xs text-anac-muted">{formatMissionPeriod(mission)}</p>
            <div className="mt-3 border-t border-anac-border pt-3">
              {mission.rapportDocumentId ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-anac-success">
                  <CheckCircle2 size={13} aria-hidden="true" /> Rapport déposé
                </span>
              ) : mission.statut === 'terminee' && mission.rapportResponsableId === user.id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMissionUpload(mission)}
                  disabled={linkReportMutation.isPending}
                  className="gap-1.5"
                >
                  <Upload size={13} aria-hidden="true" /> Déposer le rapport
                </Button>
              ) : mission.statut === 'terminee' ? (
                <span className="text-xs text-anac-muted">
                  {mission.rapportResponsableId
                    ? 'En attente du responsable désigné'
                    : 'Aucun responsable désigné'}
                </span>
              ) : (
                <span className="text-xs text-anac-muted">Mission non terminée</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-anac-border bg-white px-4 py-3">
          <p className="text-sm text-anac-muted">
            Page <strong className="text-anac-navy">{page}</strong> sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Page précédente"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Page suivante"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>
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
    </div>
  );
}
