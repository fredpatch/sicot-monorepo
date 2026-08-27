// packages/client/src/pages/documents/documents.columns.tsx
import { useMemo } from 'react';
import { Download, Eye, EyeOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { BadgeOCR } from './components/BadgeOCR';
import { DocumentActionsMenu } from './components/DocumentActionsMenu';
import { DocumentPortailBadge } from './components/DocumentPortailBadge';
import { CATEGORIES } from './documents.constants';
import { formaterTaille } from './documents.utils';
import { canManageDocuments, getDocumentCapabilities } from './documents.permissions';
import { documentsApi } from '@/lib/documents.api';
import type { Document } from './documents.types';

// Colonnes purement administratives — sans action possible pour un agent
// (statut OCR interne, bascule visibilité interne, publication portail
// externe) — masquées plutôt que grisées, pour ne pas encombrer la vue
// d'un rôle qui ne peut de toute façon rien y faire.
const COLONNES_MASQUEES_AGENT = ['statutOCR', 'visibiliteInterne', 'portail'];

interface UseDocumentsColumnsParams {
  t: TFunction;
  role: string | undefined;
  onCorrigerOCR: (doc: Document) => void;
  onRetraiterOCR: (id: number) => void;
  retraiterOCREnCours: boolean;
  onTraduire: (doc: Document) => void;
  onSupprimer: (doc: Document) => void;
  supprimerEnCours: boolean;
  onOuvrirPortail: (doc: Document) => void;
  onRetirerPortail: (id: number) => void;
  retirerPortailEnCours: boolean;
  onVerserVersion: (id: number, fichier: File) => void;
  verserVersionEnCours: boolean;
  onToggleVisibiliteInterne: (id: number, visible: boolean) => void;
  toggleVisibiliteInterneEnCours: boolean;
}

export function useDocumentsColumns({
  t,
  role,
  onCorrigerOCR,
  onRetraiterOCR,
  retraiterOCREnCours,
  onTraduire,
  onSupprimer,
  supprimerEnCours,
  onOuvrirPortail,
  onRetirerPortail,
  retirerPortailEnCours,
  onVerserVersion,
  verserVersionEnCours,
  onToggleVisibiliteInterne,
  toggleVisibiliteInterneEnCours,
}: UseDocumentsColumnsParams): ColumnDef<Document>[] {
  return useMemo<ColumnDef<Document>[]>(() => {
    const colonnes: ColumnDef<Document>[] = [
      {
        accessorKey: 'nomOriginal',
        header: 'Nom du fichier',
        enableSorting: false,
        cell: ({ row }) => (
          <>
            <div className="font-medium text-anac-navy truncate max-w-xs">
              {row.original.nomOriginal}
            </div>
            <div className="text-anac-muted text-xs">{row.original.mimeType}</div>
          </>
        ),
      },
      {
        accessorKey: 'categorie',
        header: 'Catégorie',
        enableSorting: false,
        // Édition déplacée vers l'onglet Informations du workspace (voir
        // DocumentWorkspace.tsx) — le registre n'affiche que le badge, pour
        // éviter les modifications accidentelles au survol d'une ligne.
        cell: ({ row }) => {
          const label =
            CATEGORIES.find((c) => c.value === row.original.categorie)?.label ??
            row.original.categorie;
          return <span className="text-xs text-anac-muted">{label}</span>;
        },
      },
      {
        accessorKey: 'langue',
        header: 'Langue',
        enableSorting: false,
        // Colonnes secondaires masquées en tablette pour réduire la
        // largeur — restent consultables via le workspace (onglet
        // Informations), pas perdues, juste retirées du registre étroit.
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) => (
          <span className="uppercase text-xs font-medium text-anac-muted">
            {row.original.langue ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'taille',
        header: 'Taille',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted">{formaterTaille(row.original.taille)}</span>
        ),
      },
      {
        id: 'statutOCR',
        accessorKey: 'statutOCR',
        header: 'OCR',
        enableSorting: false,
        cell: ({ row }) => <BadgeOCR statut={row.original.statutOCR} />,
      },
      {
        id: 'visibiliteInterne',
        header: 'Visibilité interne',
        enableSorting: false,
        cell: ({ row }) => {
          const doc = row.original;
          const peutGerer = canManageDocuments(role);

          return (
            <div className="flex items-center gap-1.5" data-stop-row-click>
              {doc.visibiliteInterne ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                  <Eye size={12} /> Visible en interne
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-anac-border bg-anac-gray px-2 py-1 text-xs text-anac-muted">
                  <EyeOff size={12} /> Masqué (déposant uniquement)
                </span>
              )}
              {peutGerer && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onToggleVisibiliteInterne(doc.id, !doc.visibiliteInterne)}
                  disabled={toggleVisibiliteInterneEnCours}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  {doc.visibiliteInterne ? 'Masquer' : 'Rendre visible'}
                </Button>
              )}
            </div>
          );
        },
      },
      {
        id: 'portail',
        header: 'Portail',
        enableSorting: false,
        cell: ({ row }) => <DocumentPortailBadge expose={row.original.visibilitePortail} />,
      },
      {
        accessorKey: 'version',
        header: 'Version',
        enableSorting: false,
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) => (
          <span className="text-anac-muted text-center block">v{row.original.version}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted">
            {new Date(row.original.createdAt).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const doc = row.original;
          const cap = getDocumentCapabilities(role, doc);

          return (
            <div className="flex items-center gap-1" data-stop-row-click>
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
          );
        },
      },
    ];

    return colonnes.filter(
      (colonne) => role !== 'agent' || !COLONNES_MASQUEES_AGENT.includes(colonne.id ?? '')
    );
  }, [
      t,
      role,
      onCorrigerOCR,
      onRetraiterOCR,
      retraiterOCREnCours,
      onTraduire,
      onSupprimer,
      supprimerEnCours,
      onOuvrirPortail,
      onRetirerPortail,
      retirerPortailEnCours,
      onVerserVersion,
      verserVersionEnCours,
      onToggleVisibiliteInterne,
      toggleVisibiliteInterneEnCours,
    ]
  );
}
