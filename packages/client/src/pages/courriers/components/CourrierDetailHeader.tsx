import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, FileDown, MoreHorizontal, Pencil, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PdfPreviewDialog } from '@/components/PdfPreviewDialog';
import { courriersApi } from '@/lib/courriers.api';
import type { Courrier } from '../courrier.types';
import { getCourrierHealth } from '../courrier.utils';
import { CourrierDirectionBadge } from './CourrierDirectionBadge';
import { CourrierHealthBadge } from './CourrierHealthBadge';

export function CourrierDetailHeader({
  courrier,
  canManage,
  onEdit,
  onRepondre,
  onArchiver,
  onRelancer,
  archiverEnCours,
}: {
  courrier: Courrier;
  canManage: boolean;
  onEdit: () => void;
  onRepondre: () => void;
  onArchiver: () => void;
  onRelancer: () => void;
  archiverEnCours: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const health = getCourrierHealth(courrier);
  const peutRepondre = courrier.direction === 'entrant' && courrier.suiviStatut !== 'archive';
  const peutArchiver = courrier.suiviStatut !== 'archive';
  const peutRelancer = courrier.direction === 'entrant' && courrier.suiviStatut === 'en_attente';

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
          <Link to="/courriers" className="text-anac-blue hover:text-anac-navy">
            Courriers
          </Link>
          <span>/</span>
          <span>{courrier.reference}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-anac-navy">{courrier.objet}</h2>
          <CourrierDirectionBadge direction={courrier.direction} />
          <CourrierHealthBadge health={health} />
        </div>
        <p className="mt-1 text-sm text-anac-muted">{courrier.reference}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canManage && (
          <Button type="button" variant="outline" onClick={onEdit} className="gap-2">
            <Pencil size={14} aria-hidden="true" />
            Modifier
          </Button>
        )}
        {canManage && peutRepondre && (
          <Button type="button" onClick={onRepondre} className="gap-2 bg-anac-blue">
            <Send size={14} aria-hidden="true" />
            Répondre
          </Button>
        )}
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
              className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-anac-border bg-white py-1 shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setPdfPreviewOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-anac-navy hover:bg-anac-gray"
              >
                <FileDown size={14} aria-hidden="true" />
                Imprimer / Exporter PDF
              </button>
              {canManage && peutRelancer && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRelancer();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-anac-navy hover:bg-anac-gray"
                >
                  <Send size={14} aria-hidden="true" />
                  Préparer une relance
                </button>
              )}
              {canManage && peutArchiver && (
                <button
                  type="button"
                  disabled={archiverEnCours}
                  onClick={() => {
                    setMenuOpen(false);
                    onArchiver();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-anac-navy hover:bg-anac-gray disabled:opacity-50"
                >
                  <Archive size={14} aria-hidden="true" />
                  Archiver
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        url={courriersApi.getUrlExportPDF(courrier.id)}
        titre={`Courrier ${courrier.reference}`}
      />
    </div>
  );
}
