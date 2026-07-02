export type CourrierDirection = 'entrant' | 'sortant';
export type CourrierReponseStatut = 'oui' | 'non' | 'pour_information';
export type CourrierSuiviStatut = 'en_attente' | 'repondu' | 'archive';
export type CourrierCriticite = 'normal' | 'a_surveiller' | 'critique';

export interface CreateCourrierParams {
  direction: CourrierDirection;
  objet: string;
  expediteurOrganisationId?: number;
  destinataireOrganisationId?: number;
  dateReception: Date;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: Date;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  createdByUserId: number;
}

export interface UpdateCourrierParams {
  objet?: string;
  suiviStatut?: CourrierSuiviStatut;
  dateLimiteReponse?: Date;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  updatedByUserId: number;
}

export interface CourrierFilters {
  search?: string;
  direction?: CourrierDirection;
  suiviStatut?: CourrierSuiviStatut;
  reponseRequise?: CourrierReponseStatut;
  sansReponse?: boolean;
  organisationId?: number;
  page?: number;
  pageSize?: number;
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

export interface CourrierView {
  id: number;
  reference: string;
  referenceExpediteur?: string;
  direction: CourrierDirection;
  objet: string;
  expediteur?: OrganisationResume;
  destinataire?: OrganisationResume;
  dateReception: Date;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: Date;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
  criticite?: CourrierCriticite; // calculé uniquement si en_attente + reponseRequise=oui
  joursAttente?: number;
}

export interface SeuilsCriticite {
  surveiller: number;
  critique: number;
}
