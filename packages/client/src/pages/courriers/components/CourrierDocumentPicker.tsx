import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Paperclip, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { documentsApi } from '@/lib/documents.api';

export interface DocumentLie {
  id: number;
  nom: string;
}

interface CourrierDocumentPickerProps {
  onPicked: (document: DocumentLie) => void;
  // Documents already attached — hidden from the "link existing" list so
  // the same document can't be added twice.
  excludeIds?: number[];
}

// Adds ONE document at a time (upload-new or link-existing) — the caller
// owns the resulting list (create stepper accumulates locally, the detail
// workspace calls ajouterDocumentCourrier per pick). Same upload/link
// behavior as the original single-document flat form, just no longer
// tied to a single controlled value.
export function CourrierDocumentPicker({ onPicked, excludeIds = [] }: CourrierDocumentPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [afficherListeDocs, setAfficherListeDocs] = useState(false);

  const { data: docsExistants } = useQuery({
    queryKey: ['documents-correspondances'],
    queryFn: async () => {
      const res = await documentsApi.lister({ categorie: 'correspondance', pageSize: 100 });
      return res.data as { data: { id: number; nomOriginal: string; createdAt: string }[] };
    },
    enabled: afficherListeDocs,
  });

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    if (!fichier) return;
    setUploadEnCours(true);
    setUploadErreur(null);
    try {
      const res = await documentsApi.upload(fichier, 'correspondance');
      const { document } = res.data;
      onPicked({ id: document.id, nom: document.nomOriginal });
    } catch {
      setUploadErreur("Erreur lors de l'upload.");
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const docsDisponibles = (docsExistants?.data ?? []).filter((d) => !excludeIds.includes(d.id));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadEnCours}
          className="gap-1.5"
        >
          {uploadEnCours ? (
            <>
              <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Upload...
            </>
          ) : (
            <>
              <Upload size={12} aria-hidden="true" /> Uploader
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAfficherListeDocs((v) => !v)}
          className="gap-1.5"
        >
          <Paperclip size={12} aria-hidden="true" />
          {afficherListeDocs ? 'Masquer' : 'Lier un existant'}
        </Button>
      </div>

      {afficherListeDocs && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-anac-border divide-y divide-anac-border">
          {!docsExistants ? (
            <p className="px-3 py-4 text-center text-sm text-anac-muted">
              <Loader2 size={13} className="mr-2 inline animate-spin" aria-hidden="true" />
              Chargement...
            </p>
          ) : docsDisponibles.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-anac-muted">
              Aucun document de type &quot;Correspondance&quot; disponible.
            </p>
          ) : (
            docsDisponibles.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  onPicked({ id: doc.id, nom: doc.nomOriginal });
                  setAfficherListeDocs(false);
                }}
                className="w-full px-3 py-2.5 text-left transition-colors hover:bg-anac-gray"
              >
                <div className="text-sm font-medium text-anac-navy">{doc.nomOriginal}</div>
                <div className="text-xs text-anac-muted">
                  {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {uploadErreur && <p className="text-[11px] text-anac-danger">{uploadErreur}</p>}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
        onChange={handleUpload}
      />
    </div>
  );
}
