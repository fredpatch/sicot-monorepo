// packages/client/src/pages/demandes/components/SourceBadge.tsx
import { FileText, AlignLeft } from 'lucide-react';
import type { Demande } from '../requests.types';
import { apercu } from '../requests.utils';

/** Document vs. free-text source, as used across the registry table and the workspace. */
export function RequestSourceCell({ demande, maxWidth = 160 }: { demande: Demande; maxWidth?: number }) {
  if (demande.documentNom) {
    return (
      <div className="flex items-center gap-1.5">
        <FileText size={12} className="shrink-0 text-anac-muted" aria-hidden="true" />
        <span className="truncate font-medium text-anac-navy" style={{ maxWidth }}>
          {demande.documentNom}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <AlignLeft size={12} className="shrink-0 text-anac-muted" aria-hidden="true" />
      <span className="truncate text-anac-muted" style={{ maxWidth }}>
        {apercu(demande.texteLibre)}
      </span>
    </div>
  );
}
