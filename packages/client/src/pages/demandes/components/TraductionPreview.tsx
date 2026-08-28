// packages/client/src/pages/demandes/components/TraductionPreview.tsx
//
// Read-only view of a linked translation for roles that can't open the full
// editing workshop (agent - see requests.permissions.ts canOpenTranslation).
// Server-side (GET /traductions/:id) already enforces that an agent can only
// ever reach their own linked translation; this component doesn't repeat
// that check, it just renders whatever the API returns.
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { traductionsApi, type TraductionView } from '@/lib/traductions.api';

const LABELS_STATUT: Record<string, string> = {
  a_reviser: 'À réviser',
  en_relecture: 'En relecture',
  approuvee: 'Approuvée',
  archivee: 'Archivée',
  manuelle_requise: 'Manuelle requise',
};

export function TraductionPreview({ traductionId }: { traductionId: number }) {
  const query = useQuery({
    queryKey: ['traduction-preview', traductionId],
    queryFn: async () => {
      const res = await traductionsApi.getById(traductionId);
      return res.data as TraductionView;
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-32 items-center justify-center text-anac-muted">
        <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-anac-muted">Traduction indisponible pour le moment.</p>;
  }

  const traduction = query.data;
  const texte = traduction.texteFinal ?? traduction.texteIA;
  const estTelechargeable = traduction.statut === 'approuvee' || traduction.statut === 'archivee';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="rounded border border-anac-border bg-anac-gray px-2 py-1 text-xs font-medium text-anac-navy">
          {LABELS_STATUT[traduction.statut] ?? traduction.statut}
        </span>
        {estTelechargeable ? (
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(traductionsApi.getUrlExportPDF(traductionId), '_blank')}
              className="gap-1.5"
            >
              <Download size={13} aria-hidden="true" /> PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(traductionsApi.getUrlExportDOCX(traductionId), '_blank')}
              className="gap-1.5"
            >
              <FileText size={13} aria-hidden="true" /> DOCX
            </Button>
          </div>
        ) : (
          <span className="text-xs text-anac-muted">
            Le texte peut encore changer avant approbation.
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-anac-muted">Texte traduit</p>
        <p className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-anac-border bg-anac-gray/40 p-3 text-sm text-anac-navy">
          {texte || 'Traduction en cours de production.'}
        </p>
      </div>
    </div>
  );
}
