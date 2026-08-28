// packages/client/src/pages/documents/components/DocumentPreview.tsx
import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MIME_PREVISUALISABLES = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];

// L'unique point d'accès existant est /:id/telecharger, servi en
// Content-Disposition: inline - donc directement affichable par le
// navigateur pour PDF/image dans un <iframe>. Aucune autre infrastructure de
// prévisualisation (miniature, rendu serveur) n'existe : pour tout autre
// type, on l'assume franchement plutôt que d'en inventer une.
export function DocumentPreview({
  id,
  mimeType,
  url,
}: {
  id: number;
  mimeType: string;
  url: string;
}) {
  const previsualisable = MIME_PREVISUALISABLES.includes(mimeType);

  if (!previsualisable) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-anac-border bg-anac-gray py-12 text-center">
        <FileX size={28} className="text-anac-muted" />
        <p className="text-sm text-anac-muted">Aperçu non disponible pour ce type de fichier.</p>
        <Button variant="secondary" size="sm" onClick={() => window.open(url, '_blank')}>
          Ouvrir dans un nouvel onglet
        </Button>
      </div>
    );
  }

  return (
    <iframe
      key={id}
      src={url}
      title="Aperçu du document"
      className="h-[420px] w-full rounded-lg border border-anac-border bg-white"
    />
  );
}
