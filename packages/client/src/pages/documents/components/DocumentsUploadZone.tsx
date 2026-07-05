// packages/client/src/pages/documents/components/DocumentsUploadZone.tsx
import { useRef, useState } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentsApi } from '@/lib/api';
import { CATEGORIES } from '../documents.constants';
import { useQueryClient } from '@tanstack/react-query';

export function DocumentsUploadZone() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categorieUpload, setCategorieUpload] = useState<string>('autre');
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadErreur, setUploadErreur] = useState<string | null>(null);
  const [uploadSucces, setUploadSucces] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setUploadEnCours(true);
    setUploadErreur(null);
    setUploadSucces(null);

    try {
      const response = await documentsApi.upload(fichier, categorieUpload);
      const { document, doublon, categorieProposee } = response.data;

      let message = `"${document.nomOriginal}" archivé avec succès.`;
      if (doublon) {
        message += ' ⚠️ Un fichier identique existe déjà.';
      }
      if (categorieProposee !== categorieUpload) {
        message += ` Catégorie suggérée : ${categorieProposee}.`;
      }

      setUploadSucces(message);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de l'upload.";
      setUploadErreur(msg);
    } finally {
      setUploadEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={categorieUpload} onValueChange={setCategorieUpload}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.filter((c) => c.value !== 'tous').map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadEnCours}
          className="gap-2"
        >
          {uploadEnCours ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Traitement OCR...
            </>
          ) : (
            <>
              <Upload size={13} />
              Uploader un document
            </>
          )}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.jpg,.jpeg,.png,.tiff"
          onChange={handleUpload}
        />
      </div>

      {uploadSucces && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-green-600 mt-0.5 shrink-0" />
            <span>{uploadSucces}</span>
          </div>
          <button
            onClick={() => setUploadSucces(null)}
            className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {uploadErreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <span>{uploadErreur}</span>
          </div>
          <button
            onClick={() => setUploadErreur(null)}
            className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
