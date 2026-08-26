// packages/client/src/pages/traductions/components/editor/DeposerDocumentAction.tsx
//
// Deposits the approved translation's official file into the shared
// Documents repository, tagged categorie: 'traduction' — the piece that
// makes a finished translation discoverable by any authenticated user
// (Yan, not just Fred), independent of who requested it. If the
// translation was launched from a source document, this becomes a new
// version of that document (parentId); otherwise it's a standalone upload.
import { useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeposerDocumentAction({
  onFileSelected,
  enCours,
}: {
  onFileSelected: (fichier: File) => void;
  enCours: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const fichier = event.target.files?.[0];
          if (fichier) onFileSelected(fichier);
          event.target.value = '';
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={enCours}
        className="gap-1.5"
      >
        {enCours ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Envoi...
          </>
        ) : (
          <>
            <Upload size={12} /> Déposer au dossier documentaire
          </>
        )}
      </Button>
    </>
  );
}
