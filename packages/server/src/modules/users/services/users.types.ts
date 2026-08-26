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
