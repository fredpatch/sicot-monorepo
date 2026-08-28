// packages/client/src/pages/portal/components/PortalDocumentViewer.tsx
import { useEffect, useState } from 'react';
import { FileText, Mail, X, FileWarning, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { portalApi } from '@/lib/portal.api';
import { getPreviewMode } from '../portal.utils';
import type { DocumentPortail } from '../portal.types';

interface PortalDocumentViewerProps {
  document: DocumentPortail;
  onClose: () => void;
  onTelechargement: () => void;
}

type EtatChargement = 'verification' | 'ok' | 'echec';

export function PortalDocumentViewer({
  document,
  onClose,
  onTelechargement,
}: PortalDocumentViewerProps) {
  const urlConsultation = portalApi.getUrlConsultation(document.id);
  const mode = getPreviewMode(document.mimeType);

  // Un iframe ne déclenche pas onError de façon fiable sur un statut HTTP
  // non-2xx (document retiré/introuvable entre le chargement de la liste et
  // le clic) - pré-vérification HEAD pour les PDF avant d'afficher l'iframe,
  // pour éviter un cadre vide (§28/29 du brief).
  const [etat, setEtat] = useState<EtatChargement>(mode === 'pdf' ? 'verification' : 'ok');

  useEffect(() => {
    if (mode !== 'pdf') return;
    let annule = false;
    portalApi
      .verifierConsultation(document.id)
      .then(() => {
        if (!annule) setEtat('ok');
      })
      .catch(() => {
        if (!annule) setEtat('echec');
      });
    return () => {
      annule = true;
    };
  }, [mode, document.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-anac-navy text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={16} className="shrink-0" />
          <span className="text-sm font-medium truncate">{document.nomOriginal}</span>
          <span className="text-xs text-white/60 uppercase shrink-0">
            {document.mimeType.split('/')[1]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {etat !== 'echec' && (
            <Button
              size="sm"
              onClick={onTelechargement}
              className="gap-1.5 bg-anac-sky hover:bg-anac-sky/80 text-white border-0 h-8"
            >
              <Mail size={13} /> Recevoir le lien
            </Button>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-100">
        {etat === 'verification' && (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-anac-muted" />
          </div>
        )}

        {etat === 'echec' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <AlertTriangle size={32} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-600">
                Impossible d&apos;afficher ce document.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Il n&apos;est peut-être plus disponible sur le portail.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="gap-1.5">
                Fermer
              </Button>
            </div>
          </div>
        )}

        {etat === 'ok' && mode === 'pdf' && (
          <iframe
            src={urlConsultation}
            className="w-full h-full border-0"
            title={document.nomOriginal}
          />
        )}

        {etat === 'ok' && mode === 'image' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={urlConsultation}
              alt={document.nomOriginal}
              className="max-w-full max-h-full object-contain rounded shadow-lg"
              onError={() => setEtat('echec')}
            />
          </div>
        )}

        {etat === 'ok' && mode === 'unsupported' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <FileWarning size={32} className="text-gray-400" />
            <p className="text-sm text-gray-500">Aperçu non disponible pour ce type de fichier.</p>
            <Button
              onClick={onTelechargement}
              className="gap-1.5 bg-anac-sky hover:bg-anac-sky/85 text-white"
            >
              <Mail size={13} /> Recevoir le lien
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
