export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPublic {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  role: string;
}

export interface LoginResult {
  premiereConnexion: boolean;
  tokens?: AuthTokens;
  user?: UserPublic;
  message: string;
}
