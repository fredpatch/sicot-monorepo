// packages/client/src/pages/traductions/traductions.columns.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { confirmToast } from '@/lib/confirm-toast';
import { BadgeStatut } from './components/StatusBadge';
import { BadgeDirection } from './components/DirectionBadge';
import { formaterDate, apercu } from './traductions.utils';
import type { Traduction } from './traductions.types';

interface UseTraductionsColumnsParams {
  t: TFunction;
  onSupprimer: (id: number) => void;
  supprimerEnCours: boolean;
}

export function useTraductionsColumns({
  t,
  onSupprimer,
  supprimerEnCours,
}: UseTraductionsColumnsParams): ColumnDef<Traduction>[] {
  const navigate = useNavigate();

  return useMemo<ColumnDef<Traduction>[]>(
    () => [
      {
        id: 'texteOriginal',
        header: 'Texte original',
        enableSorting: false,
        cell: ({ row }) => (
          <>
            <p className="text-anac-navy text-sm truncate max-w-xs">
              {apercu(row.original.texteOriginal)}
            </p>
            {row.original.documentId && (
              <p className="text-xs text-anac-muted mt-0.5">Document #{row.original.documentId}</p>
            )}
          </>
        ),
      },
      {
        accessorKey: 'direction',
        header: 'Direction',
        enableSorting: false,
        cell: ({ row }) => <BadgeDirection direction={row.original.direction} />,
      },
      {
        accessorKey: 'statut',
        header: 'Statut',
        enableSorting: false,
        cell: ({ row }) => <BadgeStatut statut={row.original.statut} />,
      },
      {
        accessorKey: 'moteurUtilise',
        header: 'Moteur',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-anac-muted capitalize">{row.original.moteurUtilise}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted text-xs">{formaterDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const trad = row.original;
          const peutSupprimer = trad.statut !== 'approuvee' && trad.statut !== 'archivee';
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate(`/traductions/${trad.id}`)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                {trad.statut === 'a_reviser' || trad.statut === 'en_relecture'
                  ? 'Réviser'
                  : 'Consulter'}
              </Button>

              {peutSupprimer && (
                <>
                  <span className="text-anac-border">·</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() =>
                      confirmToast('Supprimer cette traduction ?', () => onSupprimer(trad.id))
                    }
                    disabled={supprimerEnCours}
                    className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                  >
                    Supprimer
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [t, navigate, onSupprimer, supprimerEnCours]
  );
}
