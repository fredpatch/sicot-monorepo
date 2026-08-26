import { Link } from 'react-router-dom';
import { Archive, CheckCircle2, Download, FileText, Loader2, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { confirmToast } from '@/lib/confirm-toast';
import { traductionsApi } from '@/lib/traductions.api';
import { BadgeStatut } from '../StatusBadge';
import { BadgeDirection } from '../DirectionBadge';
import type { Traduction } from '../../traductions.types';

interface WorkshopHeaderProps {
  traduction: Traduction;
  modifie: boolean;
  sauvegarde: boolean;
  estEditable: boolean;
  estApprouvee: boolean;
  estArchivee: boolean;
  peutApprouver: boolean;
  peutApprouverTexte: boolean;
  onSave: () => void;
  saveEnCours: boolean;
  onApprove: () => void;
  approveEnCours: boolean;
  onArchive: () => void;
  archiveEnCours: boolean;
  onDelete: () => void;
  deleteEnCours: boolean;
  peutRelancer: boolean;
  onRelancer: () => void;
  relanceEnCours: boolean;
}

export function WorkshopHeader({
  traduction,
  modifie,
  sauvegarde,
  estEditable,
  estApprouvee,
  estArchivee,
  peutApprouver,
  peutApprouverTexte,
  onSave,
  saveEnCours,
  onApprove,
  approveEnCours,
  onArchive,
  archiveEnCours,
  onDelete,
  deleteEnCours,
  peutRelancer,
  onRelancer,
  relanceEnCours,
}: WorkshopHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-anac-border bg-white px-6 py-3 shrink-0 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
          <Link to="/traductions" className="text-anac-blue hover:text-anac-navy">
            Traductions
          </Link>
          <span>/</span>
          <span>#{traduction.id}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <BadgeStatut statut={traduction.statut} />
          <BadgeDirection direction={traduction.direction} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {sauvegarde && (
          <span className="text-xs text-anac-success flex items-center gap-1">
            <CheckCircle2 size={12} /> Sauvegardé
          </span>
        )}

        {peutRelancer && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRelancer}
            disabled={relanceEnCours}
            className="gap-1.5"
          >
            {relanceEnCours ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Relance...
              </>
            ) : (
              <>
                <RotateCw size={12} /> Relancer la traduction
              </>
            )}
          </Button>
        )}

        {estEditable && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSave}
            disabled={!modifie || saveEnCours}
            className="gap-1.5"
          >
            {saveEnCours ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </Button>
        )}

        {peutApprouver && (
          <Button
            size="sm"
            onClick={onApprove}
            disabled={approveEnCours || !peutApprouverTexte}
            className="gap-1.5"
          >
            {approveEnCours ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Approbation...
              </>
            ) : (
              <>
                <CheckCircle2 size={12} /> Approuver
              </>
            )}
          </Button>
        )}

        {(estApprouvee || estArchivee) && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(traductionsApi.getUrlExportPDF(traduction.id), '_blank')}
              className="gap-1.5"
            >
              <Download size={12} /> PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(traductionsApi.getUrlExportDOCX(traduction.id), '_blank')}
              className="gap-1.5"
            >
              <FileText size={12} /> DOCX
            </Button>
          </>
        )}

        {estApprouvee && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onArchive}
            disabled={archiveEnCours}
            className="gap-1.5"
          >
            {archiveEnCours ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Archivage...
              </>
            ) : (
              <>
                <Archive size={12} /> Archiver
              </>
            )}
          </Button>
        )}

        {!estArchivee && !estApprouvee && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => confirmToast('Supprimer cette traduction ? Cette action est réversible.', onDelete)}
            disabled={deleteEnCours}
            className="gap-1.5 text-anac-muted hover:text-anac-danger hover:border-anac-danger"
          >
            {deleteEnCours ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Suppression...
              </>
            ) : (
              'Supprimer'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
