// packages/client/src/pages/portal/components/PortalDocumentCard.tsx
import { Eye, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPortalCategoryLabel } from '../portal.constants';
import { formatTaille, formatLangueCourt, formatDateAjout } from '../portal.utils';
import type { DocumentPortail } from '../portal.types';

interface PortalDocumentCardProps {
  doc: DocumentPortail;
  onConsulter: () => void;
  onTelecharger: () => void;
}

export function PortalDocumentCard({ doc, onConsulter, onTelecharger }: PortalDocumentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-anac-border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center shrink-0">
          <FileText size={18} className="text-anac-navy" />
        </div>
        <span className="text-[11px] font-medium text-anac-sky bg-anac-sky/8 rounded-full px-2.5 py-0.5">
          {getPortalCategoryLabel(doc.categorie)}
        </span>
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-anac-navy leading-snug line-clamp-2">
          {doc.nomOriginal}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-anac-muted flex-wrap">
          <span>{formatTaille(doc.taille)}</span>
          <span>·</span>
          <span>{formatLangueCourt(doc.langue) ?? 'Non précisée'}</span>
          <span>·</span>
          <span>{formatDateAjout(doc.createdAt)}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-anac-border">
        <Button
          variant="secondary"
          onClick={onConsulter}
          aria-label={`Consulter ${doc.nomOriginal}`}
          className="flex-1 gap-1.5 text-xs h-11"
        >
          <Eye size={13} /> Consulter
        </Button>
        <Button
          onClick={onTelecharger}
          aria-label={`Recevoir le lien de téléchargement pour ${doc.nomOriginal}`}
          className="flex-1 gap-1.5 text-xs h-11 bg-anac-sky hover:bg-anac-sky/85 text-white"
        >
          <Mail size={13} /> Recevoir le lien
        </Button>
      </div>
    </div>
  );
}
