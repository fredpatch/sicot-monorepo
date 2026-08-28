import { UserRole } from '@sicot/shared';

export interface CreateUserParams {
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  poste?: string;
  service?: string;
  direction?: string;
  createdByUserId: number;
}

export interface UpdateUserParams {
  role?: UserRole;
  actif?: boolean;
  email?: string;
  updatedByUserId: number;
}

export interface UserFilters {
  search?: string; // recherche sur matricule, nom, prénom
  role?: UserRole;
  actif?: boolean;
  page?: number;
  pageSize?: number;
}

// ── Vue publique d'un utilisateur ─────────────────────────────────────────
// On n'expose jamais motDePasseHash, otpHash, etc.
export interface UserView {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string | null;
  service: string | null;
  direction: string | null;
  role: UserRole;
  actif: boolean;
  premiereConnexion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Vue détail (GET /users/:id) - ajoute la dernière connexion réelle, dérivée
// du journal d'audit (voir auth.service.ts#getDerniereConnexion). Absente du
// listing pour éviter une requête d'audit par ligne.
export interface UserDetailView extends UserView {
  derniereConnexion: Date | null;
}

export interface UsersAggregates {
  total: number;
  actifs: number;
  inactifs: number;
  premiereConnexionEnAttente: number;
}
