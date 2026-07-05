// packages/client/src/pages/audit/audit.columns.tsx
import { useMemo } from 'react';
import { Eye } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { formatDateHeure } from './audit.utils';
import type { AuditLog } from './audit.types';

interface UseAuditColumnsParams {
  t: TFunction;
  onViewDetails: (log: AuditLog) => void;
}

export function useAuditColumns({
  t,
  onViewDetails,
}: UseAuditColumnsParams): ColumnDef<AuditLog>[] {
  return useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date / heure',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-text whitespace-nowrap">
            {formatDateHeure(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'utilisateur',
        header: 'Utilisateur',
        enableSorting: false,
        cell: ({ row }) => {
          const log = row.original;
          return log.userMatricule ? (
            <div>
              <div className="font-medium text-anac-navy">
                {log.userPrenom} {log.userNom}
              </div>
              <div className="text-anac-muted text-xs font-mono">{log.userMatricule}</div>
            </div>
          ) : (
            <span className="text-anac-muted">Système</span>
          );
        },
      },
      {
        accessorKey: 'module',
        header: 'Module',
        enableSorting: false,
        cell: ({ row }) => <span className="badge-info">{row.original.module}</span>,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-anac-text">{row.original.action}</span>
        ),
      },
      {
        accessorKey: 'entiteId',
        header: 'Entité',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted flex items-center justify-center font-mono text-xs">
            {row.original.entiteId ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'ip',
        header: 'IP',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted font-mono text-xs">{row.original.ip ?? '-'}</span>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="link"
            size="sm"
            onClick={() => onViewDetails(row.original)}
            className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy gap-1"
          >
            <Eye size={12} /> Détails
          </Button>
        ),
      },
    ],
    [t, onViewDetails]
  );
}
