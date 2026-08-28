// packages/client/src/pages/documents/components/DocumentsMobileCards.tsx
import { Download } from 'lucide-react';
import type { UserRole } from '@sicot/shared';
import { Button } from '@/components/ui/button';
import { documentsApi } from '@/lib/documents.api';
import { BadgeOCR } from './BadgeOCR';
import { DocumentActionsMenu } from './DocumentActionsMenu';
import { CATEGORIES } from '../documents.constants';
import { formaterTaille } from '../documents.utils';
import { getDocumentCapabilities } from '../documents.permissions';
import type { Document } from '../documents.types';

interface DocumentsMobileCardsProps {
  documents: Document[];
  role: UserRole | undefined;
  onOpen: (doc: Document) => void;
  onTraduire: (doc: Document) => void;
  onCorrigerOCR: (doc: Document) => void;
  onRetraiterOCR: (id: number) => void;
  retraiterOCREnCours: boolean;
  onVerserVersion: (id: number, fichier: File) => void;
  verserVersionEnCours: boolean;
  onOuvrirPortail: (doc: Document) => void;
  onRetirerPortail: (id: number) => void;
  retirerPortailEnCours: boolean;
  onSupprimer: (doc: Document) => void;
  supprimerEnCours: boolean;
}

// Repli mobile du registre (< md) - mêmes données que documents.columns.tsx,
// même logique de capacités, présentées en cartes plutôt qu'en tableau. Le
// document sélectionné ouvre le même DocumentWorkspace que sur desktop.
export function DocumentsMobileCards({
  documents,
  role,
  onOpen,
  onTraduire,
  onCorrigerOCR,
  onRetraiterOCR,
  retraiterOCREnCours,
  onVerserVersion,
  verserVersionEnCours,
  onOuvrirPortail,
  onRetirerPortail,
  retirerPortailEnCours,
  onSupprimer,
  supprimerEnCours,
}: DocumentsMobileCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {documents.map((doc) => {
        const cap = getDocumentCapabilities(role, doc);
        const categorieLabel =
          CATEGORIES.find((c) => c.value === doc.categorie)?.label ?? doc.categorie;

        return (
          <div
            key={doc.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(doc)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpen(doc);
            }}
            className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-anac-navy">{doc.nomOriginal}</p>
                <p className="text-xs text-anac-muted">{categorieLabel}</p>
              </div>
              <BadgeOCR statut={doc.statutOCR} />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-anac-muted">
              <span className="uppercase">{doc.langue ?? '-'}</span>
              <span>{formaterTaille(doc.taille)}</span>
              <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>

            <div
              className="mt-3 flex items-center justify-between gap-2 border-t border-anac-border pt-3"
              data-stop-row-click
              onClick={(e) => e.stopPropagation()}
            >
              {cap.canTranslate ? (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onTraduire(doc)}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  Traduire
                </Button>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.open(documentsApi.getUrlTelechargement(doc.id), '_blank')}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  <Download size={11} className="inline mr-1" />
                  Télécharger
                </Button>
              )}

              <DocumentActionsMenu
                document={doc}
                capabilities={cap}
                onCorrigerOCR={onCorrigerOCR}
                onRetraiterOCR={onRetraiterOCR}
                retraiterOCREnCours={retraiterOCREnCours}
                onVerserVersion={onVerserVersion}
                verserVersionEnCours={verserVersionEnCours}
                onOuvrirPortail={onOuvrirPortail}
                onRetirerPortail={onRetirerPortail}
                retirerPortailEnCours={retirerPortailEnCours}
                onSupprimer={onSupprimer}
                supprimerEnCours={supprimerEnCours}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
