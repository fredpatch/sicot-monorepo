import { users } from '@/db/schema';
import type { UserView } from './users.types';

export function toUserView(user: typeof users.$inferSelect): UserView {
  return {
    id: user.id,
    matricule: user.matricule,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    actif: user.actif,
    premiereConnexion: user.premiereConnexion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
