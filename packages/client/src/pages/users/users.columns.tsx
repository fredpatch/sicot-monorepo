// packages/client/src/pages/utilisateurs/utilisateurs.columns.tsx
import { useMemo } from 'react';
import { KeyRound, Pencil, Power, PowerOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { confirmToast } from '@/lib/confirm-toast';
import { useAuth } from '@/App';
import { BadgeRole } from './components/RolesBadge';
import { BadgeStatutCompte } from './components/AccountStatusBadge';
import type { Utilisateur } from './users.types';

interface UseUtilisateursColumnsParams {
  t: TFunction;
  onModifier: (utilisateur: Utilisateur) => void;
  onToggleActivation: (id: number, actif: boolean) => void;
  toggleActivationEnCours: boolean;
  onReinitialiserOTP: (id: number) => void;
  reinitialiserOTPEnCours: boolean;
}

export function useUtilisateursColumns({
  t,
  onModifier,
  onToggleActivation,
  toggleActivationEnCours,
  onReinitialiserOTP,
  reinitialiserOTPEnCours,
}: UseUtilisateursColumnsParams): ColumnDef<Utilisateur>[] {
  const { user } = useAuth();

  return useMemo<ColumnDef<Utilisateur>[]>(
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
        accessorKey: 'email',
        header: 'Email',
        enableSorting: false,
        cell: ({ row }) => <span className="text-anac-muted text-xs">{row.original.email}</span>,
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
        cell: ({ row }) => <BadgeStatutCompte utilisateur={row.original} />,
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          const estSoiMeme = u.id === user?.id;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="link"
                size="sm"
                onClick={() => onModifier(u)}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                <Pencil size={11} className="mr-1" />
                Modifier
              </Button>

              <span className="text-anac-border">·</span>

              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  confirmToast(
                    `Réinitialiser l'OTP de ${u.prenom} ${u.nom} ? Un nouveau code sera envoyé par email.`,
                    () => onReinitialiserOTP(u.id)
                  )
                }
                disabled={reinitialiserOTPEnCours || !u.actif}
                className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
              >
                <KeyRound size={11} className="mr-1" />
                Réinitialiser OTP
              </Button>

              {!estSoiMeme && (
                <>
                  <span className="text-anac-border">·</span>
                  {u.actif ? (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        confirmToast(`Désactiver le compte de ${u.prenom} ${u.nom} ?`, () =>
                          onToggleActivation(u.id, false)
                        )
                      }
                      disabled={toggleActivationEnCours}
                      className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                    >
                      <PowerOff size={11} className="mr-1" />
                      Désactiver
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onToggleActivation(u.id, true)}
                      disabled={toggleActivationEnCours}
                      className="h-auto p-0 text-xs text-green-600 hover:text-green-800"
                    >
                      <Power size={11} className="mr-1" />
                      Activer
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [t, user, onModifier, onToggleActivation, toggleActivationEnCours, onReinitialiserOTP, reinitialiserOTPEnCours]
  );
}