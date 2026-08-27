// packages/client/src/pages/utilisateurs/utilisateurs.types.ts
import type { UserRole } from '@sicot/shared';

export interface Utilisateur {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  // Renseignés uniquement pour les comptes créés depuis l'annuaire Personnel
  // ANAC (voir CreateUserDialog.tsx) — null pour une création manuelle. Déjà
  // renvoyés par GET /users, simplement absents du type client jusqu'ici.
  poste: string | null;
  service: string | null;
  direction: string | null;
  role: UserRole;
  actif: boolean;
  premiereConnexion: boolean;
  createdAt: string;
  updatedAt: string;
}

// Vue détail (GET /users/:id) — ajoute la dernière connexion réelle, dérivée
// du journal d'audit côté serveur (pas de colonne dédiée). Volontairement
// absente du listing pour éviter une requête d'audit par ligne de tableau.
export interface UtilisateurDetail extends Utilisateur {
  derniereConnexion: string | null;
}

export interface UsersAggregates {
  total: number;
  actifs: number;
  inactifs: number;
  premiereConnexionEnAttente: number;
}

// Ce que renvoie la recherche/liste Personnel ANAC (voir module serveur personnel-anac)
export interface PersonnelAnacResultat {
  matricule: string;
  nom: string | null;
  prenom: string | null;
  organisationLabel: string | null;
  poste: string | null;
  service: string | null;
  direction: string | null;
}

// Champs pré-remplis dans le dialog de création, en provenance de l'onglet Personnel ANAC
export interface PrefillUtilisateur {
  matricule: string;
  nom: string;
  prenom: string;
  poste?: string | null;
  service?: string | null;
  direction?: string | null;
}