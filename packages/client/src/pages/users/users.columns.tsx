// packages/client/src/pages/utilisateurs/utilisateurs.columns.tsx
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { getInitiales } from './users.utils';
import { BadgeRole } from './components/RolesBadge';
import { BadgeStatutCompte } from './components/AccountStatusBadge';
import { BadgePremiereConnexion } from './components/OnboardingBadge';
import { UserActionsMenu } from './components/UserActionsMenu';
import type { Utilisateur } from './users.types';

interface UseUtilisateursColumnsParams {
  t: TFunction;
  currentUserId: number | undefined;
  onVoir: (utilisateur: Utilisateur) => void;
  onModifier: (utilisateur: Utilisateur) => void;
  onToggleActivation: (id: number, actif: boolean) => void;
  toggleActivationEnCours: boolean;
  onReinitialiserOTP: (id: number) => void;
  reinitialiserOTPEnCours: boolean;
}

export function useUtilisateursColumns({
  t,
  currentUserId,
  onVoir,
  onModifier,
  onToggleActivation,
  toggleActivationEnCours,
  onReinitialiserOTP,
  reinitialiserOTPEnCours,
}: UseUtilisateursColumnsParams): ColumnDef<Utilisateur>[] {
  return useMemo<ColumnDef<Utilisateur>[]>(
    () => [
      {
        id: 'utilisateur',
        header: 'Utilisateur',
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-anac-navy/8 text-xs font-semibold text-anac-navy"
                aria-hidden="true"
              >
                {getInitiales(u.prenom, u.nom)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-anac-navy">
                  {u.prenom} {u.nom}
                </p>
                <p className="truncate text-xs text-anac-muted">{u.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'matricule',
        header: 'Matricule',
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-xs text-anac-text">{row.original.matricule}</span>,
      },
      {
        accessorKey: 'role',
        header: 'Rôle',
        enableSorting: false,
        cell: ({ row }) => <BadgeRole role={row.original.role} />,
      },
      {
        id: 'statut',
        header: 'Statut',
        enableSorting: false,
        cell: ({ row }) => <BadgeStatutCompte actif={row.original.actif} />,
        meta: { className: 'hidden sm:table-cell' },
      },
      {
        id: 'premiereConnexion',
        header: 'Première connexion',
        enableSorting: false,
        cell: ({ row }) => <BadgePremiereConnexion premiereConnexion={row.original.premiereConnexion} />,
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        id: 'createdAt',
        header: 'Créé le',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-anac-muted">
            {new Date(row.original.createdAt).toLocaleDateString('fr-FR')}
          </span>
        ),
        meta: { className: 'hidden xl:table-cell' },
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-1" data-stop-row-click onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="sm" onClick={() => onVoir(u)}>
                Voir
              </Button>
              <UserActionsMenu
                utilisateur={u}
                currentUserId={currentUserId}
                onModifier={onModifier}
                onReinitialiserOTP={onReinitialiserOTP}
                reinitialiserOTPEnCours={reinitialiserOTPEnCours}
                onToggleActivation={onToggleActivation}
                toggleActivationEnCours={toggleActivationEnCours}
              />
            </div>
          );
        },
      },
    ],
    [
      t,
      currentUserId,
      onVoir,
      onModifier,
      onToggleActivation,
      toggleActivationEnCours,
      onReinitialiserOTP,
      reinitialiserOTPEnCours,
    ]
  );
}
