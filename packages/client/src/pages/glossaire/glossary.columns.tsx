// packages/client/src/pages/glossaire/glossaire.columns.tsx
import { useMemo } from 'react';
import { History, EyeOff, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { formaterDate } from './glossary.utils';
import type { Terme } from './glossary.types';

interface UseGlossaireColumnsParams {
  t: TFunction;
  onModifier: (terme: Terme) => void;
  onHistorique: (terme: Terme) => void;
  onDesactiver: (id: number) => void;
  desactiverEnCours: boolean;
}

export function useGlossaireColumns({
  t,
  onModifier,
  onHistorique,
  onDesactiver,
  desactiverEnCours,
}: UseGlossaireColumnsParams): ColumnDef<Terme>[] {
  return useMemo<ColumnDef<Terme>[]>(
    () => [
      {
        accessorKey: 'termeFr',
        header: 'Français',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium text-anac-navy">{row.original.termeFr}</span>
        ),
      },
      {
        accessorKey: 'termeEn',
        header: 'Anglais',
        enableSorting: false,
        cell: ({ row }) => <span className="text-anac-text">{row.original.termeEn}</span>,
      },
      {
        accessorKey: 'domaine',
        header: 'Domaine',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.domaine ? (
            <span className="text-[11px] bg-anac-navy/8 text-anac-navy rounded px-1.5 py-0.5">
              {row.original.domaine}
            </span>
          ) : (
            <span className="text-anac-muted">—</span>
          ),
      },
      {
        accessorKey: 'contexte',
        header: 'Contexte',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.contexte ? (
            <span
              className="text-xs text-anac-muted truncate max-w-[180px] block"
              title={row.original.contexte}
            >
              {row.original.contexte}
            </span>
          ) : (
            <span className="text-anac-muted">—</span>
          ),
      },
      {
        accessorKey: 'actif',
        header: 'Statut',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.actif ? (
            <span className="badge-actif">Actif</span>
          ) : (
            <span className="badge-expire">Inactif</span>
          ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Modifié',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted text-xs">{formaterDate(row.original.updatedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const terme = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="link"
                size="sm"
                onClick={() => onModifier(terme)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                <Pencil size={11} className="mr-1" />
                Modifier
              </Button>

              <span className="text-anac-border">·</span>

              <Button
                variant="link"
                size="sm"
                onClick={() => onHistorique(terme)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                <History size={11} className="mr-1" />
                Historique
              </Button>

              {terme.actif && (
                <>
                  <span className="text-anac-border">·</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onDesactiver(terme.id)}
                    disabled={desactiverEnCours}
                    className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                  >
                    <EyeOff size={11} className="mr-1" />
                    Désactiver
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [t, onModifier, onHistorique, onDesactiver, desactiverEnCours]
  );
}
