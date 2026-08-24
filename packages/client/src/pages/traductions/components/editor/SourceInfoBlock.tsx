import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { documentsApi } from '@/lib/documents.api';
import type { Traduction } from '../../traductions.types';

interface DocumentMeta {
  nomOriginal: string;
  mimeType: string;
}

export function SourceInfoBlock({ traduction }: { traduction: Traduction }) {
  const documentQuery = useQuery({
    queryKey: ['document', traduction.documentId],
    queryFn: async () => {
      const res = await documentsApi.getById(traduction.documentId!);
      return res.data as DocumentMeta;
    },
    enabled: traduction.documentId !== undefined,
    retry: false,
  });

  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-anac-muted">Source</p>
      {traduction.documentId ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-anac-navy">Document #{traduction.documentId}</p>
          {documentQuery.data && (
            <>
              <p className="text-xs text-anac-muted">{documentQuery.data.nomOriginal}</p>
              <p className="text-xs text-anac-muted">{documentQuery.data.mimeType}</p>
            </>
          )}
          <a
            href={documentsApi.getUrlTelechargement(traduction.documentId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-anac-sky hover:text-anac-navy"
          >
            <ExternalLink size={11} /> Ouvrir le document
          </a>
        </div>
      ) : (
        <p className="text-sm font-medium text-anac-navy">Texte libre</p>
      )}
    </div>
  );
}
