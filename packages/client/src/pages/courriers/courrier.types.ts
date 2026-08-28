import type {
  CourrierDirection,
  CourrierReponseStatut,
  CourrierSuiviStatut,
} from '@/lib/courriers.api';

export type CourrierCriticite = 'normal' | 'a_surveiller' | 'critique';

export interface ContactResume {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
}

export interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
  contactPrincipal?: {
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
  };
}

export interface DocumentResume {
  id: number;
  nomOriginal: string;
  mimeType: string;
  createdAt: string;
}

export interface Courrier {
  id: number;
  reference: string;
  referenceExpediteur?: string;
  direction: CourrierDirection;
  objet: string;
  expediteur?: OrganisationResume;
  destinataire?: OrganisationResume;
  // The specific contact chosen within expediteur/destinataire, if any -
  // an explicit choice, not automatically the organisation's contactPrincipal.
  expediteurContact?: ContactResume;
  destinataireContact?: ContactResume;
  dateReception: string;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: string;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documents: DocumentResume[];
  createdPar?: number;
  createdAt: string;
  updatedAt: string;
  // Derived server-side - never stored - see courrier.utils.ts /
  // the server's calculerCriticite().
  criticite?: CourrierCriticite;
  joursAttente?: number;
}

export interface CourrierListResponse {
  data: Courrier[];
  total: number;
}

export interface CourriersAggregates {
  total: number;
  aTraiter: number;
  enAttenteReponse: number;
  enDepassement: number;
  envoyes: number;
}

export type { CourrierDirection, CourrierReponseStatut, CourrierSuiviStatut };
