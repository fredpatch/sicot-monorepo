import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { BadgeType } from './components/BadgeType';
import type { Organisation } from './partenaires.types';

interface UsePartenairesColumnsParams {
  t: TFunction;
  onEdit: (organisation: Organisation) => void;
  onViewContacts: (organisation: Organisation) => void;
}

export function usePartenairesColumns({
  t,
  onEdit,
  onViewContacts,
}: UsePartenairesColumnsParams): ColumnDef<Organisation>[] {
  const navigate = useNavigate();

  return useMemo<ColumnDef<Organisation>[]>(
    () => [
      {
        accessorKey: 'nom',
        header: 'Organisation',
        cell: ({ row }) => (
          <>
            <div className="font-medium text-anac-navy">{row.original.nom}</div>
            {row.original.notes && (
              <div className="text-anac-muted text-xs truncate max-w-xs">{row.original.notes}</div>
            )}
          </>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <BadgeType type={row.original.type} />,
      },
      {
        accessorKey: 'pays',
        header: 'Pays',
        cell: ({ row }) => <span className="text-anac-text">{row.original.pays}</span>,
      },
      {
        accessorKey: 'region',
        header: 'Région',
        cell: ({ row }) => <span className="text-anac-muted">{row.original.region ?? '-'}</span>,
      },
      {
        accessorKey: 'actif',
        header: 'Statut',
        cell: ({ row }) =>
          row.original.actif ? (
            <span className="badge-actif">{t('common.active')}</span>
          ) : (
            <span className="badge-expire">{t('common.inactive')}</span>
          ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="link"
                size="sm"
                onClick={() => onEdit(org)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                {t('common.edit')}
              </Button>
              <span className="text-anac-border">·</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => onViewContacts(org)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                Contacts
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate(`/accords?partenaireId=${org.id}`)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                Accords
              </Button>
            </div>
          );
        },
      },
    ],
    [t, navigate, onEdit, onViewContacts]
  );
}
