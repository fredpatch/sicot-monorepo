import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, MoreHorizontal, Pencil, Printer, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { PdfPreviewDialog } from '@/components/PdfPreviewDialog';
import { missionsApi } from '@/lib/missions.api';
import type { Mission } from '../mission.types';
import { MissionStatusBadge } from './MissionStatusBadge';
import { MissionPeriod } from './MissionPeriod';

export function MissionDetailHeader({
  mission,
  onEdit,
  onCancelMission,
}: {
  mission: Mission;
  onEdit: () => void;
  onCancelMission: () => void;
}) {
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const isCancelled = mission.statut === 'annulee';

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
          <Link to="/missions" className="inline-flex items-center gap-1 text-anac-blue hover:text-anac-navy">
            <ArrowLeft size={13} aria-hidden="true" />
            Missions
          </Link>
          <span>/</span>
          <span>{mission.titre}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-anac-navy">{mission.titre}</h2>
          <MissionStatusBadge statut={mission.statut} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-anac-muted">
          {mission.destination}, {mission.pays} ·{' '}
          <MissionPeriod dateDebut={mission.dateDebut} dateFin={mission.dateFin} />
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onEdit} disabled={isCancelled} className="gap-2">
          <Pencil size={14} aria-hidden="true" />
          Modifier
        </Button>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Plus d'actions"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </Button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-anac-border bg-white py-1 shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  window.print();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-anac-navy hover:bg-anac-gray"
              >
                <Printer size={14} aria-hidden="true" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setPdfPreviewOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-anac-navy hover:bg-anac-gray"
              >
                <FileDown size={14} aria-hidden="true" />
                Exporter le rapport PDF
              </button>
              {!isCancelled && (
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    if (
                      await confirm({
                        title: 'Annuler cette mission ?',
                        description: 'Elle ne pourra plus être modifiée.',
                        confirmLabel: 'Annuler la mission',
                        variant: 'destructive',
                      })
                    ) {
                      onCancelMission();
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-anac-danger hover:bg-red-50"
                >
                  <XCircle size={14} aria-hidden="true" />
                  Annuler la mission
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        url={missionsApi.getUrlExportPDF(mission.id)}
        titre={`Mission — ${mission.titre}`}
      />
    </div>
  );
}
