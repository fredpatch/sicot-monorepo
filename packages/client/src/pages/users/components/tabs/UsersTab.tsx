// packages/client/src/pages/utilisateurs/onglets/OngletUtilisateurs.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';

import { useUtilisateursColumns } from '../../users.columns';
import { useUtilisateursQuery, PAGE_SIZE } from '@/pages/users/hooks/queries'; 
import { useUtilisateursMutations } from '@/pages/users/hooks/mutations';
import { UtilisateursFiltres } from '@/pages/users/components/UsersFilters';
import { ModifierUtilisateurDialog } from '../../components/EditUserDialog';
import type { Utilisateur } from '../../users.types';

export function OngletUtilisateurs() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [actif, setActif] = useState('');
  const [page, setPage] = useState(1);

  const [utilisateurSelectionne, setUtilisateurSelectionne] = useState<Utilisateur | null>(null);

  const { data, isLoading } = useUtilisateursQuery({ search, role, actif, page });

  const { modifierMutation, toggleActivationMutation, reinitialiserOTPMutation } = useUtilisateursMutations({
    utilisateurSelectionneId: utilisateurSelectionne?.id,
    onModifie: () => setUtilisateurSelectionne(null),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useUtilisateursColumns({
    t,
    onModifier: setUtilisateurSelectionne,
    onToggleActivation: (id, actifCible) => toggleActivationMutation.mutate({ id, actif: actifCible }),
    toggleActivationEnCours: toggleActivationMutation.isPending,
    onReinitialiserOTP: (id) => reinitialiserOTPMutation.mutate(id),
    reinitialiserOTPEnCours: reinitialiserOTPMutation.isPending,
  });

  return (
    <div className="space-y-4">
      <UtilisateursFiltres
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        role={role}
        onRoleChange={(v) => {
          setRole(v);
          setPage(1);
        }}
        actif={actif}
        onActifChange={(v) => {
          setActif(v);
          setPage(1);
        }}
        onReset={() => {
          setSearch('');
          setRole('');
          setActif('');
          setPage(1);
        }}
      />

      <DataTable
        columns={colonnes}
        data={data?.data ?? []}
        isLoading={isLoading}
        loadingMessage={t('common.loading')}
        emptyMessage={t('common.noData')}
      />

      <DataTablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel={t('common.page')}
        ofLabel={t('common.of')}
      />

      <ModifierUtilisateurDialog
        utilisateur={utilisateurSelectionne}
        onOpenChange={(open) => !open && setUtilisateurSelectionne(null)}
        onSubmit={(data) => modifierMutation.mutate(data)}
        chargement={modifierMutation.isPending}
      />
    </div>
  );
}