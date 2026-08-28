// packages/client/src/pages/documents/components/DocumentActionsMenu.tsx
import { useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocumentCapabilities } from '../documents.permissions';
import type { Document } from '../documents.types';

interface DocumentActionsMenuProps {
  document: Document;
  capabilities: DocumentCapabilities;
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

// Regroupe les actions de mutation secondaires derrière un menu « Plus
// d'actions » - l'action contextuelle principale (Traduire/Ouvrir) reste
// visible directement dans la cellule, voir documents.columns.tsx.
export function DocumentActionsMenu({
  document: doc,
  capabilities: cap,
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
}: DocumentActionsMenuProps) {
  const aUneAction =
    cap.canCorrectOcr ||
    cap.canRetryOcr ||
    cap.canUpload ||
    cap.canManagePortal ||
    cap.canDelete;

  const fichierInputRef = useRef<HTMLInputElement>(null);

  if (!aUneAction) return null;

  return (
    <>
      {/* Rendu hors du menu : le contenu du menu se démonte à la fermeture,
          l'input doit donc vivre dans l'arbre du composant lui-même. */}
      <input
        ref={fichierInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const fichier = event.target.files?.[0];
          if (fichier) onVerserVersion(doc.id, fichier);
          event.target.value = '';
        }}
      />

      <DropdownMenu>
        {/* Pas de Button ici (asChild) : ce Button est bâti sur @base-ui/react,
            tandis que ce menu est du Radix - les deux ne composent pas de
            façon fiable via asChild/cloneElement. Le Trigger Radix rend déjà
            un <button> natif, qu'on stylise directement. */}
        <DropdownMenuTrigger
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-anac-muted transition-colors hover:bg-anac-gray hover:text-anac-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          aria-label="Plus d'actions"
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {cap.canCorrectOcr && doc.statutOCR !== 'traite' && (
            <DropdownMenuItem onSelect={() => onCorrigerOCR(doc)}>Corriger OCR</DropdownMenuItem>
          )}

          {cap.canRetryOcr && (
            <DropdownMenuItem
              disabled={retraiterOCREnCours}
              onSelect={() => onRetraiterOCR(doc.id)}
            >
              {retraiterOCREnCours ? 'Relance en cours…' : 'Relancer OCR'}
            </DropdownMenuItem>
          )}

          {/* Verser une nouvelle version -> POST /:id/nouvelle-version, requires
              DOCUMENT_UPLOAD server-side (documents.route.ts), not
              DOCUMENT_CATEGORY_MANAGE — fixed during the Phase 10.4 audit;
              previously mislabeled (harmless today since both capabilities
              are granted together to operateur+, but the wrong name). */}
          {cap.canUpload && (
            <DropdownMenuItem
              disabled={verserVersionEnCours}
              onSelect={() => fichierInputRef.current?.click()}
            >
              {verserVersionEnCours ? 'Envoi en cours…' : 'Verser une nouvelle version'}
            </DropdownMenuItem>
          )}

          {cap.canManagePortal && doc.statutOCR === 'traite' && (
            <>
              <DropdownMenuSeparator />
              {doc.visibilitePortail ? (
                <DropdownMenuItem
                  disabled={retirerPortailEnCours}
                  onSelect={() => onRetirerPortail(doc.id)}
                >
                  Retirer du portail
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => onOuvrirPortail(doc)}>
                  Publier sur le portail
                </DropdownMenuItem>
              )}
            </>
          )}

          {cap.canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="danger"
                disabled={supprimerEnCours}
                onSelect={() => onSupprimer(doc)}
              >
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
