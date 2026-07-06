// packages/client/src/pages/utilisateurs/components/BadgeStatutCompte.tsx
import type { Utilisateur } from '../users.types';

export function BadgeStatutCompte({ utilisateur }: { utilisateur: Utilisateur }) {
  if (!utilisateur.actif) return <span className="badge-expire">Inactif</span>;
  if (utilisateur.premiereConnexion) return <span className="badge-attention">1ère connexion en attente</span>;
  return <span className="badge-actif">Actif</span>;
}