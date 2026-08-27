// packages/client/src/pages/utilisateurs/components/UsersMobileCards.tsx
import { getInitiales } from '../users.utils';
import { BadgeRole } from './RolesBadge';
import { BadgeStatutCompte } from './AccountStatusBadge';
import { BadgePremiereConnexion } from './OnboardingBadge';
import { UserActionsMenu } from './UserActionsMenu';
import type { Utilisateur } from '../users.types';

interface UsersMobileCardsProps {
  utilisateurs: Utilisateur[];
  currentUserId: number | undefined;
  onVoir: (u: Utilisateur) => void;
  onModifier: (u: Utilisateur) => void;
  onReinitialiserOTP: (id: number) => void;
  reinitialiserOTPEnCours: boolean;
  onToggleActivation: (id: number, actif: boolean) => void;
  toggleActivationEnCours: boolean;
}

// Repli mobile du registre (< md) — mêmes données que users.columns.tsx,
// même menu d'actions, présentées en cartes plutôt qu'en tableau.
export function UsersMobileCards({
  utilisateurs,
  currentUserId,
  onVoir,
  onModifier,
  onReinitialiserOTP,
  reinitialiserOTPEnCours,
  onToggleActivation,
  toggleActivationEnCours,
}: UsersMobileCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {utilisateurs.map((u) => (
        <div
          key={u.id}
          role="button"
          tabIndex={0}
          onClick={() => onVoir(u)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onVoir(u);
          }}
          className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-anac-navy/8 text-xs font-semibold text-anac-navy"
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
            <BadgeStatutCompte actif={u.actif} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BadgeRole role={u.role} />
            <BadgePremiereConnexion premiereConnexion={u.premiereConnexion} />
          </div>

          <div className="mt-2 text-xs text-anac-muted">
            <span className="font-mono">{u.matricule}</span>
          </div>

          <div
            className="mt-3 flex items-center justify-between gap-2 border-t border-anac-border pt-3"
            data-stop-row-click
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-anac-muted">
              Créé le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
            </span>
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
        </div>
      ))}
    </div>
  );
}
