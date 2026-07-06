// packages/client/src/pages/utilisateurs/onglets/OngletPersonnelAnac.tsx
import { useMemo, useState } from 'react';
import { UserPlus, AlertCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';

import { usePersonnelAnacQuery, PAGE_SIZE } from '../../hooks/queries';
import type { PersonnelAnacResultat } from '../../users.types';

interface OngletPersonnelAnacProps {
  onCreerCompte: (personnel: PersonnelAnacResultat) => void;
}

export function OngletPersonnelAnac({ onCreerCompte }: OngletPersonnelAnacProps) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = usePersonnelAnacQuery({ page, q });

  const enRecherche = q.trim().length >= 2;
  const totalPages = data && !enRecherche ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useMemo<ColumnDef<PersonnelAnacResultat>[]>(
    () => [
      {
        accessorKey: 'matricule',
        header: 'Matricule',
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-xs text-anac-text">{row.original.matricule}</span>,
      },
      {
        id: 'nomComplet',
        header: 'Nom',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium text-anac-navy">
            {row.original.prenom} {row.original.nom}
          </span>
        ),
      },
      {
        accessorKey: 'organisationLabel',
        header: 'Service / Direction / Fonction',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted text-xs">{row.original.organisationLabel ?? '—'}</span>
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
            onClick={() => onCreerCompte(row.original)}
            className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy gap-1"
          >
            <UserPlus size={12} /> Créer un compte SICOT
          </Button>
        ),
      },
    ],
    [t, onCreerCompte]
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <Input
          type="text"
          placeholder="Rechercher un agent par nom ou prénom (min. 2 caractères)..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="w-80"
        />
        <p className="text-xs text-anac-muted mt-2">
          Annuaire Personnel ANAC — lecture seule, via l&apos;API interne ANAC IT. Email et rôle SICOT ne sont pas
          fournis par cet annuaire et resteront à saisir manuellement.
        </p>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Service Personnel ANAC injoignable. Réessayez plus tard, ou créez le compte manuellement dans l\'onglet Utilisateurs.'}
        </div>
      )}

      <DataTable
        columns={colonnes}
        data={data?.data ?? []}
        isLoading={isLoading}
        loadingMessage={t('common.loading')}
        emptyMessage={enRecherche ? 'Aucun agent trouvé' : t('common.noData')}
      />

      {!enRecherche && (
        <DataTablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageLabel={t('common.page')}
          ofLabel={t('common.of')}
        />
      )}
    </div>
  );
}