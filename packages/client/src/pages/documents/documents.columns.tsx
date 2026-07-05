// packages/client/src/pages/documents/documents.columns.tsx
import { useMemo } from 'react';
import { Globe, GlobeLock, Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BadgeOCR } from './components/BadgeOCR';
import { CATEGORIES } from './documents.constants';
import { formaterTaille } from './documents.utils';
import type { Document } from './documents.types';

interface UseDocumentsColumnsParams {
  t: TFunction;
  onChangerCategorie: (id: number, cat: string) => void;
  onCorrigerOCR: (doc: Document) => void;
  onRetraiterOCR: (id: number) => void;
  retraiterOCREnCours: boolean;
  onTraduire: (doc: Document) => void;
  onSupprimer: (doc: Document) => void;
  supprimerEnCours: boolean;
  onOuvrirPortail: (doc: Document) => void;
  onRetirerPortail: (id: number) => void;
  retirerPortailEnCours: boolean;
}

export function useDocumentsColumns({
  t,
  onChangerCategorie,
  onCorrigerOCR,
  onRetraiterOCR,
  retraiterOCREnCours,
  onTraduire,
  onSupprimer,
  supprimerEnCours,
  onOuvrirPortail,
  onRetirerPortail,
  retirerPortailEnCours,
}: UseDocumentsColumnsParams): ColumnDef<Document>[] {
  return useMemo<ColumnDef<Document>[]>(
    () => [
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
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <Select value={doc.categorie} onValueChange={(cat) => onChangerCategorie(doc.id, cat)}>
              <SelectTrigger className="h-7 text-xs w-36 px-2">
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
          );
        },
      },
      {
        accessorKey: 'langue',
        header: 'Langue',
        enableSorting: false,
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
        accessorKey: 'statutOCR',
        header: 'OCR',
        enableSorting: false,
        cell: ({ row }) => <BadgeOCR statut={row.original.statutOCR} />,
      },
      {
        id: 'portail',
        header: 'Portail Externe',
        enableSorting: false,
        cell: ({ row }) => {
          const doc = row.original;
          return doc.visibilitePortail ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2.5 text-xs flex items-center gap-2">
              <Globe size={13} />
              <span>
                Document est visible sur le portail externe.
                {doc.portailTokenDureeJours
                  ? ` Liens de téléchargement valables ${doc.portailTokenDureeJours} jour(s).`
                  : ' Liens de téléchargement sans expiration.'}
              </span>
            </div>
          ) : (
            <div className="bg-anac-gray border border-anac-border text-anac-muted rounded-lg px-3 py-2.5 text-xs flex items-center gap-2">
              <GlobeLock size={13} />
              <span>Document non exposé sur le portail externe.</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'version',
        header: 'Version',
        enableSorting: false,
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
          return (
            <div className="flex items-center gap-2 flex-wrap">
              {doc.statutOCR !== 'traite' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onCorrigerOCR(doc)}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  Corriger OCR
                </Button>
              )}

              {(doc.statutOCR === 'echec' || doc.statutOCR === 'a_retraiter') && (
                <>
                  <span className="text-anac-border">·</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onRetraiterOCR(doc.id)}
                    disabled={retraiterOCREnCours}
                    className="h-auto p-0 text-xs text-amber-600 hover:text-amber-800"
                  >
                    {retraiterOCREnCours ? (
                      <>
                        <Loader2 size={11} className="animate-spin inline mr-1" />
                        OCR...
                      </>
                    ) : (
                      'Relancer OCR'
                    )}
                  </Button>
                </>
              )}

              {doc.texteExtrait && doc.statutOCR === 'traite' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onTraduire(doc)}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  Traduire
                </Button>
              )}

              <span className="text-anac-border">·</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => onSupprimer(doc)}
                disabled={supprimerEnCours}
                className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
              >
                Supprimer
              </Button>

              {doc.statutOCR === 'traite' && (
                <>
                  <span className="text-anac-border">·</span>
                  {doc.visibilitePortail ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href="/portail"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Globe size={11} /> Exposé
                      </a>
                      <span className="text-anac-border">·</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onRetirerPortail(doc.id)}
                        disabled={retirerPortailEnCours}
                        className="h-auto p-0 text-xs text-red-400 hover:text-red-600"
                      >
                        Retirer
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onOuvrirPortail(doc)}
                      className="h-auto p-0 text-xs text-anac-muted hover:text-anac-sky"
                    >
                      <GlobeLock size={11} className="inline mr-1" />
                      Portail
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [
      t,
      onChangerCategorie,
      onCorrigerOCR,
      onRetraiterOCR,
      retraiterOCREnCours,
      onTraduire,
      onSupprimer,
      supprimerEnCours,
      onOuvrirPortail,
      onRetirerPortail,
      retirerPortailEnCours,
    ]
  );
}
