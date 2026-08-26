// packages/client/src/pages/documents/components/VerserVersionAction.tsx
//
// Re-uploads a file as a new version of an existing document (POST
// /documents/:id/nouvelle-version — existed server-side but had no UI
// caller). Typical use: an admin reformats a translated report into the
// official ANAC layout and needs to put that final file back without
// creating an unrelated, disconnected document entry.
import { useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VerserVersionAction({
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
        variant="link"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={enCours}
        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
      >
        {enCours ? (
          <>
            <Loader2 size={11} className="animate-spin inline mr-1" />
            Envoi...
          </>
        ) : (
          <>
            <Upload size={11} className="inline mr-1" />
            Verser version finale
          </>
        )}
      </Button>
    </>
  );
}
