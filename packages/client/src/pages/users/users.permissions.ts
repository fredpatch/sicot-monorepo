// packages/client/src/pages/utilisateurs/utilisateurs.permissions.ts
//
// Point d'entrée unique pour toute décision d'affichage/action liée à un
// compte utilisateur - évite de disperser des `u.id === user?.id` /
// `!u.actif` dans les colonnes, le menu d'actions et le panneau de détail.
// Mirrors the server-side rules exactly (users.service.ts) :
// - un admin ne peut pas se désactiver lui-même (contrôleur)
// - le super_admin ne peut jamais être désactivé, par personne (service)
export function isCurrentUser(currentUserId: number | undefined, u: { id: number }): boolean {
  return currentUserId !== undefined && currentUserId === u.id;
}

export interface UserCapabilities {
  canResetOtp: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
}

export function getUserCapabilities(
  currentUserId: number | undefined,
  u: { id: number; actif: boolean; role: string }
): UserCapabilities {
  return {
    canResetOtp: u.actif,
    canActivate: !u.actif,
    canDeactivate: u.actif && !isCurrentUser(currentUserId, u) && u.role !== 'super_admin',
  };
}
