// packages/client/src/pages/portal/components/PortalDocumentsTable.tsx
import { Eye, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPortalCategoryLabel } from '../portal.constants';
import { formatTaille, formatLangueCourt, formatDateAjout } from '../portal.utils';
import type { DocumentPortail } from '../portal.types';

interface PortalDocumentsTableProps {
  documents: DocumentPortail[];
  onConsulter: (doc: DocumentPortail) => void;
  onTelecharger: (doc: DocumentPortail) => void;
}

// Catalogue public, pas un DataTable interne (§8/§17 du brief) : en-tête
// clair (pas navy), lignes aérées (~64px), pas de zébrage dense. Colonnes
// public-safe uniquement - pas de Partenaire/Pays/Auteur.
export function PortalDocumentsTable({
  documents,
  onConsulter,
  onTelecharger,
}: PortalDocumentsTableProps) {
  return (
    <div className="hidden md:block rounded-2xl border border-anac-border overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-anac-border">
            <th className="text-left font-medium text-xs uppercase tracking-wide text-anac-muted px-5 py-3.5">
              Document
            </th>
            <th className="text-left font-medium text-xs uppercase tracking-wide text-anac-muted px-4 py-3.5">
              Catégorie
            </th>
            <th className="text-left font-medium text-xs uppercase tracking-wide text-anac-muted px-4 py-3.5">
              Langue
            </th>
            <th className="text-left font-medium text-xs uppercase tracking-wide text-anac-muted px-4 py-3.5">
              Date
            </th>
            <th className="text-left font-medium text-xs uppercase tracking-wide text-anac-muted px-4 py-3.5">
              Taille
            </th>
            <th className="text-right font-medium text-xs uppercase tracking-wide text-anac-muted px-5 py-3.5">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, i) => (
            <tr
              key={doc.id}
              className={i !== documents.length - 1 ? 'border-b border-anac-border/60' : ''}
            >
              <td className="px-5 py-4 max-w-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-anac-navy/8 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-anac-navy" />
                  </div>
                  <div className="min-w-0">
                    <p
                      title={doc.nomOriginal}
                      tabIndex={0}
                      className="truncate font-semibold text-anac-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-anac-sky rounded"
                    >
                      {doc.nomOriginal}
                    </p>
                    <p className="text-[11px] text-anac-muted uppercase">
                      {doc.mimeType.split('/')[1]}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-xs font-medium text-anac-sky bg-anac-sky/8 rounded-full px-2.5 py-1">
                  {getPortalCategoryLabel(doc.categorie)}
                </span>
              </td>
              <td className="px-4 py-4 text-anac-muted">{formatLangueCourt(doc.langue) ?? '-'}</td>
              <td className="px-4 py-4 text-anac-muted">{formatDateAjout(doc.createdAt)}</td>
              <td className="px-4 py-4 text-anac-muted">{formatTaille(doc.taille)}</td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onConsulter(doc)}
                    aria-label={`Consulter ${doc.nomOriginal}`}
                    className="gap-1.5 h-9 px-2 lg:px-2.5"
                  >
                    <Eye size={13} /> <span className="hidden lg:inline">Consulter</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onTelecharger(doc)}
                    aria-label={`Recevoir le lien de téléchargement pour ${doc.nomOriginal}`}
                    className="gap-1.5 h-9 px-2 lg:px-2.5 bg-anac-sky hover:bg-anac-sky/85 text-white"
                  >
                    <Mail size={13} /> <span className="hidden lg:inline">Recevoir le lien</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
