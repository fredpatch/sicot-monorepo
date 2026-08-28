// packages/client/src/pages/utilisateurs/components/UserActionsMenu.tsx
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { confirmToast } from '@/lib/confirm-toast';
import { getUserCapabilities } from '../users.permissions';
import type { Utilisateur } from '../users.types';

interface UserActionsMenuProps {
  utilisateur: Utilisateur;
  currentUserId: number | undefined;
  onModifier: (u: Utilisateur) => void;
  onReinitialiserOTP: (id: number) => void;
  reinitialiserOTPEnCours: boolean;
  onToggleActivation: (id: number, actif: boolean) => void;
  toggleActivationEnCours: boolean;
}

// Regroupe les actions de mutation secondaires derrière un menu « Plus
// d'actions » - la consultation (Voir) reste le bouton principal visible
// directement dans la cellule, voir users.columns.tsx.
export function UserActionsMenu({
  utilisateur: u,
  currentUserId,
  onModifier,
  onReinitialiserOTP,
  reinitialiserOTPEnCours,
  onToggleActivation,
  toggleActivationEnCours,
}: UserActionsMenuProps) {
  const cap = getUserCapabilities(currentUserId, u);

  return (
    <DropdownMenu>
      {/* Pas de Button ici (asChild) : ce Button est bâti sur @base-ui/react,
          tandis que ce menu est du Radix - les deux ne composent pas de façon
          fiable via asChild/cloneElement. Le Trigger Radix rend déjà un
          <button> natif, qu'on stylise directement. */}
      <DropdownMenuTrigger
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-anac-muted transition-colors hover:bg-anac-gray hover:text-anac-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
        aria-label="Plus d'actions"
      >
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onModifier(u)}>Modifier</DropdownMenuItem>

        <DropdownMenuItem
          disabled={!cap.canResetOtp || reinitialiserOTPEnCours}
          onSelect={() =>
            confirmToast(
              `Réinitialiser l'OTP de ${u.prenom} ${u.nom} ? Un nouveau code sera envoyé par email.`,
              () => onReinitialiserOTP(u.id)
            )
          }
        >
          Réinitialiser l&apos;OTP
        </DropdownMenuItem>

        {(cap.canActivate || cap.canDeactivate) && <DropdownMenuSeparator />}

        {cap.canActivate && (
          <DropdownMenuItem
            disabled={toggleActivationEnCours}
            onSelect={() => onToggleActivation(u.id, true)}
          >
            Activer
          </DropdownMenuItem>
        )}

        {cap.canDeactivate && (
          <DropdownMenuItem
            variant="danger"
            disabled={toggleActivationEnCours}
            onSelect={() =>
              confirmToast(`Désactiver le compte de ${u.prenom} ${u.nom} ?`, () =>
                onToggleActivation(u.id, false)
              )
            }
          >
            Désactiver
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
