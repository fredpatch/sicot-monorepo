export type CourrierDirection = 'entrant' | 'sortant';
export type CourrierReponseStatut = 'oui' | 'non' | 'pour_information';
export type CourrierSuiviStatut = 'en_attente' | 'repondu' | 'archive';
export type CourrierCriticite = 'normal' | 'a_surveiller' | 'critique';

export interface CreateCourrierParams {
  direction: CourrierDirection;
  objet: string;
  expediteurOrganisationId?: number;
  destinataireOrganisationId?: number;
  // Optional refinement of the organisation above - a specific contact
  // there, not a replacement for the organisation link.
  expediteurContactId?: number;
  destinataireContactId?: number;
  dateReception: Date;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: Date;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documentIds?: number[];
  createdByUserId: number;
}

export interface UpdateCourrierParams {
  objet?: string;
  dateReception?: Date;
  reponseRequise?: CourrierReponseStatut;
  expediteurOrganisationId?: number;
  destinataireOrganisationId?: number;
  // Explicit null clears a mistakenly-set contact - distinct from
  // undefined ("don't touch"), same convention as Missions' contactSurPlaceId.
  expediteurContactId?: number | null;
  destinataireContactId?: number | null;
  suiviStatut?: CourrierSuiviStatut;
  dateLimiteReponse?: Date;
  accordId?: number;
  missionId?: number;
  updatedByUserId: number;
}

export interface CourrierFilters {
  search?: string;
  direction?: CourrierDirection;
  suiviStatut?: CourrierSuiviStatut;
  reponseRequise?: CourrierReponseStatut;
  sansReponse?: boolean;
  // Derived - entrant + reponseRequise:oui + en_attente + dateReception au-delà
  // du seuil "critique" (voir chargerSeuils/calculerCriticite).
  enDepassement?: boolean;
  organisationId?: number;
  dateDebut?: Date;
  dateFin?: Date;
  page?: number;
  pageSize?: number;
}

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
  createdAt: Date;
}

export interface CourrierView {
  id: number;
  reference: string;
  referenceExpediteur?: string;
  direction: CourrierDirection;
  objet: string;
  expediteur?: OrganisationResume;
  destinataire?: OrganisationResume;
  // The specific contact within expediteur/destinataire, if one was chosen
  // - falls back to nothing (not automatically contactPrincipal) since an
  // explicit choice shouldn't be silently swapped for a different person.
  expediteurContact?: ContactResume;
  destinataireContact?: ContactResume;
  dateReception: Date;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: Date;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documents: DocumentResume[];
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

// Compteurs globaux, indépendants des filtres courants - mirrors
// MissionsAggregates/OrganisationsAggregates.
export interface CourriersAggregates {
  total: number;
  aTraiter: number;
  enAttenteReponse: number;
  enDepassement: number;
  envoyes: number;
}
