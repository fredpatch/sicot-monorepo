// packages/client/src/pages/utilisateurs/onglets/OngletUtilisateurs.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { useAuth } from '@/App';

import { useUtilisateursColumns } from '../../users.columns';
import {
  useUtilisateursQuery,
  useUtilisateursAggregatesQuery,
  PAGE_SIZE,
} from '@/pages/users/hooks/queries';
import { useUtilisateursMutations } from '@/pages/users/hooks/mutations';
import { UtilisateursFiltres } from '@/pages/users/components/UsersFilters';
import { UsersSummaryCards } from '../UsersSummaryCards';
import { UsersMobileCards } from '../UsersMobileCards';
import { UserWorkspace } from '../UserWorkspace';
import { ModifierUtilisateurDialog } from '../../components/EditUserDialog';
import type { Utilisateur } from '../../users.types';

export function OngletUtilisateurs() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [actif, setActif] = useState('');
  const [page, setPage] = useState(1);

  const [utilisateurSelectionne, setUtilisateurSelectionne] = useState<Utilisateur | null>(null);
  const [utilisateurAModifier, setUtilisateurAModifier] = useState<Utilisateur | null>(null);

  const { data, isLoading } = useUtilisateursQuery({ search, role, actif, page });
  const { data: aggregates } = useUtilisateursAggregatesQuery();

  const { modifierMutation, toggleActivationMutation, reinitialiserOTPMutation } = useUtilisateursMutations({
    utilisateurSelectionneId: utilisateurAModifier?.id,
    onModifie: () => setUtilisateurAModifier(null),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useUtilisateursColumns({
    t,
    currentUserId: user?.id,
    onVoir: setUtilisateurSelectionne,
    onModifier: setUtilisateurAModifier,
    onToggleActivation: (id, actifCible) => toggleActivationMutation.mutate({ id, actif: actifCible }),
    toggleActivationEnCours: toggleActivationMutation.isPending,
    onReinitialiserOTP: (id) => reinitialiserOTPMutation.mutate(id),
    reinitialiserOTPEnCours: reinitialiserOTPMutation.isPending,
  });

  return (
    <div className="space-y-4">
      <UsersSummaryCards aggregates={aggregates} />

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
        onRowClick={setUtilisateurSelectionne}
        className="hidden md:block"
      />

      <UsersMobileCards
        utilisateurs={data?.data ?? []}
        currentUserId={user?.id}
        onVoir={setUtilisateurSelectionne}
        onModifier={setUtilisateurAModifier}
        onReinitialiserOTP={(id) => reinitialiserOTPMutation.mutate(id)}
        reinitialiserOTPEnCours={reinitialiserOTPMutation.isPending}
        onToggleActivation={(id, actifCible) => toggleActivationMutation.mutate({ id, actif: actifCible })}
        toggleActivationEnCours={toggleActivationMutation.isPending}
      />
      {!isLoading && (data?.data.length ?? 0) === 0 && (
        <p className="py-8 text-center text-sm text-anac-muted md:hidden">{t('common.noData')}</p>
      )}

      <DataTablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel={t('common.page')}
        ofLabel={t('common.of')}
      />

      <UserWorkspace
        utilisateur={utilisateurSelectionne}
        currentUserId={user?.id}
        onOpenChange={(open) => !open && setUtilisateurSelectionne(null)}
        onModifier={(u) => {
          setUtilisateurSelectionne(null);
          setUtilisateurAModifier(u);
        }}
        onReinitialiserOTP={(id) => reinitialiserOTPMutation.mutate(id)}
        reinitialiserOTPEnCours={reinitialiserOTPMutation.isPending}
        onToggleActivation={(id, actifCible) => toggleActivationMutation.mutate({ id, actif: actifCible })}
        toggleActivationEnCours={toggleActivationMutation.isPending}
      />

      <ModifierUtilisateurDialog
        utilisateur={utilisateurAModifier}
        onOpenChange={(open) => !open && setUtilisateurAModifier(null)}
        onSubmit={(data) => modifierMutation.mutate(data)}
        chargement={modifierMutation.isPending}
      />
    </div>
  );
}
