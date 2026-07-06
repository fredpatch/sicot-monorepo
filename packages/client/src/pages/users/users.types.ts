// packages/client/src/pages/utilisateurs/utilisateurs.types.ts
import type { UserRole } from '@sicot/shared';

export interface Utilisateur {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  actif: boolean;
  premiereConnexion: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ce que renvoie la recherche/liste Personnel ANAC (voir module serveur personnel-anac)
export interface PersonnelAnacResultat {
  matricule: string;
  nom: string | null;
  prenom: string | null;
  organisationLabel: string | null;
}

// Champs pré-remplis dans le dialog de création, en provenance de l'onglet Personnel ANAC
export interface PrefillUtilisateur {
  matricule: string;
  nom: string;
  prenom: string;
}