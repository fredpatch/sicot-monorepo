import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { documentsApi } from '@/lib/documents.api';
import { courriersApi } from '@/lib/courriers.api';
import type { Courrier } from '../courrier.types';
import { CourrierDocumentPicker } from './CourrierDocumentPicker';

// Fully interactive now — courrier.documents is a real list (courrier_documents
// join table), backed by dedicated add/remove endpoints, not the edit form.
export function CourrierDocumentSection({ courrier }: { courrier: Courrier }) {
  const queryClient = useQueryClient();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['courrier', courrier.id] });
    queryClient.invalidateQueries({ queryKey: ['courriers'] });
  };

  const ajouterMutation = useMutation({
    mutationFn: (documentId: number) => courriersApi.ajouterDocument(courrier.id, documentId),
    onSuccess: () => {
      invalidate();
      setAjoutOuvert(false);
    },
  });

  const retirerMutation = useMutation({
    mutationFn: (documentId: number) => courriersApi.retirerDocument(courrier.id, documentId),
    onSuccess: invalidate,
  });

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-anac-navy">
          Documents joints {courrier.documents.length > 0 && `(${courrier.documents.length})`}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setAjoutOuvert((v) => !v)} className="gap-1.5">
          <Plus size={13} aria-hidden="true" />
          Ajouter
        </Button>
      </div>

      {courrier.documents.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {courrier.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-md border border-anac-border p-4">
              <span className="flex items-center gap-3">
                <FileText size={18} className="text-anac-blue" aria-hidden="true" />
                <span>
                  <span className="block font-semibold text-anac-navy">{doc.nomOriginal}</span>
                  <span className="text-xs text-anac-muted">{doc.mimeType}</span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                <a
                  href={documentsApi.getUrlTelechargement(doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-anac-blue"
                >
                  <ExternalLink size={16} aria-label={`Ouvrir ${doc.nomOriginal}`} />
                </a>
                <button
                  type="button"
                  onClick={() => retirerMutation.mutate(doc.id)}
                  disabled={retirerMutation.isPending}
                  className="text-anac-muted transition-colors hover:text-anac-danger disabled:opacity-50"
                  aria-label={`Retirer ${doc.nomOriginal}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-md border border-anac-border bg-anac-gray p-6 text-center">
          <p className="font-medium text-anac-navy">Aucun document joint.</p>
        </div>
      )}

      {ajoutOuvert && (
        <div className="mt-4 border-t border-anac-border pt-4">
          <CourrierDocumentPicker
            onPicked={(doc) => ajouterMutation.mutate(doc.id)}
            excludeIds={courrier.documents.map((d) => d.id)}
          />
          {ajouterMutation.error && (
            <p className="mt-2 text-xs text-anac-danger">Impossible d&apos;ajouter ce document.</p>
          )}
        </div>
      )}
    </section>
  );
}
