// packages/client/src/pages/profil/profil.types.ts
export interface MonProfil {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string | null;
  service: string | null;
  direction: string | null;
  role: string;
  actif: boolean;
  createdAt: string;
  derniereConnexion: string | null;
}
