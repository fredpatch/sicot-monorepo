// ─────────────────────────────────────────────
// SICOT – Shared Types
// Utilisés par le client React ET le serveur Express
// ─────────────────────────────────────────────

// ── Rôles utilisateur ──────────────────────────────────────────────────────
export type UserRole = 'agent' | 'traducteur' | 'relecteur' | 'admin' | 'super_admin';

export interface User {
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

// ── M10 – Audit ────────────────────────────────────────────────────────────
export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  module: string;
  entiteId?: number;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

// ── M2 – Partenaires ───────────────────────────────────────────────────────
export type OrganisationType = 'anac_etrangere' | 'organisation_internationale' | 'autre';

export interface Organisation {
  id: number;
  nom: string;
  pays: string;
  region?: string;
  type: OrganisationType;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: number;
  organisationId: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  principal: boolean;
  actif: boolean;
  createdAt: string;
}

// ── M1 – Accords ───────────────────────────────────────────────────────────
export type AccordStatut = 'actif' | 'expire' | 'suspendu' | 'en_renouvellement';

export interface Accord {
  id: number;
  reference: string; // ACC-2026-XXXX
  titre: string;
  statut: AccordStatut;
  dateSignature: string;
  dateExpiration?: string;
  parentId?: number; // pour les renouvellements
  partenaires: Organisation[];
  documentId?: number;
  createdAt: string;
  updatedAt: string;
}

// ── M4 – Correspondances ───────────────────────────────────────────────────
export type CourrierDirection = 'entrant' | 'sortant';
export type CourrierReponseStatut = 'oui' | 'non' | 'pour_information';
export type CourrierSuiviStatut = 'en_attente' | 'repondu' | 'archive';

export interface Courrier {
  id: number;
  reference: string; // CORR-2026-XXXX
  referenceExpediteur?: string;
  direction: CourrierDirection;
  objet: string;
  expediteurId?: number;
  destinataireId?: number;
  dateReception: string;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: string;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number; // fil de correspondance
  accordId?: number;
  missionId?: number;
  createdAt: string;
  updatedAt: string;
}

// ── M3 – Missions ──────────────────────────────────────────────────────────
export type MissionStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type RecommandationStatut = 'en_attente' | 'en_cours' | 'realisee';

export interface Mission {
  id: number;
  titre: string;
  destination: string;
  pays: string;
  dateDebut: string;
  dateFin: string;
  statut: MissionStatut;
  participants: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Recommandation {
  id: number;
  missionId: number;
  texte: string;
  responsableId?: number;
  dateLimite?: string;
  statut: RecommandationStatut;
  createdAt: string;
  updatedAt: string;
}

// ── M8 – Documents ─────────────────────────────────────────────────────────
export type DocumentCategorie =
  | 'accord'
  | 'correspondance'
  | 'mission'
  | 'traduction'
  | 'glossaire'
  | 'autre';
export type DocumentStatutOCR = 'en_attente' | 'traite' | 'a_retraiter' | 'echec';

export interface Document {
  id: number;
  nom: string;
  nomOriginal: string;
  chemin: string;
  mimeType: string;
  taille: number;
  categorie: DocumentCategorie;
  langue?: string;
  texteExtrait?: string;
  statutOCR: DocumentStatutOCR;
  hashMD5: string;
  version: number;
  parentId?: number;
  uploadePar: number;
  createdAt: string;
}

// ── M7 – Glossaire ─────────────────────────────────────────────────────────
export interface TermeGlossaire {
  id: number;
  termeFr: string;
  termeEn: string;
  domaine?: string;
  contexte?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── M6 – Traduction ────────────────────────────────────────────────────────
export type TraductionStatut =
  | 'a_reviser'
  | 'en_relecture'
  | 'approuvee'
  | 'archivee'
  | 'manuelle_requise';
export type TraductionDirection = 'fr_en' | 'en_fr';

export interface Traduction {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: TraductionDirection;
  statut: TraductionStatut;
  moteurUtilise: 'libretranslate' | 'deepl' | 'manuel';
  traducteurId?: number;
  relecteurId?: number;
  createdAt: string;
  updatedAt: string;
}

// ── M5 – Demandes de traduction ────────────────────────────────────────────
export type DemandeStatut =
  | 'soumise'
  | 'en_cours'
  | 'en_relecture'
  | 'validee'
  | 'archivee';
export type DemandePriorite = 'normale' | 'urgente';

export interface DemandTraduction {
  id: number;
  demandeurId: number;
  traducteurId?: number;
  documentId?: number;
  texteLibre?: string;
  direction: TraductionDirection;
  prioriteDemandee: DemandePriorite;
  prioriteValidee?: DemandePriorite;
  statut: DemandeStatut;
  traductionId?: number;
  createdAt: string;
  updatedAt: string;
}

// ── M9 – Dashboard ─────────────────────────────────────────────────────────
export interface DashboardStats {
  traductions: {
    total: number;
    enCours: number;
    validees: number;
    manuelles: number;
  };
  correspondances: {
    total: number;
    sansReponse: number;
  };
  accords: {
    actifs: number;
    expirantSous90j: number;
  };
  missions: {
    enCours: number;
    recommandationsEnAttente: number;
  };
  documents: {
    total: number;
    aRetraiter: number;
  };
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface LoginPayload {
  matricule: string;
  otp?: string;
  motDePasse?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'createdAt' | 'updatedAt'>;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ── Pagination ─────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
