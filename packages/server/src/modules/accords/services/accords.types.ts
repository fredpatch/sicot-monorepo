export type AccordStatut = 'actif' | 'expire' | 'suspendu' | 'en_renouvellement';

export interface CreateAccordParams {
  titre: string;
  dateSignature: Date;
  dateExpiration?: Date;
  partenairesIds: number[];
  documentId?: number;
  notes?: string;
  createdByUserId: number;
}

export interface UpdateAccordParams {
  titre?: string;
  statut?: AccordStatut;
  dateSignature?: Date;
  dateExpiration?: Date;
  partenairesIds?: number[];
  documentId?: number;
  notes?: string;
  updatedByUserId: number;
}

export interface AccordFilters {
  search?: string;
  statut?: AccordStatut;
  partenairesId?: number;
  expirantAvant?: Date;
  page?: number;
  pageSize?: number;
}

export interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
  type: string;
  contactPrincipal?: {
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
  };
}

export interface AccordView {
  id: number;
  reference: string;
  titre: string;
  statut: AccordStatut;
  dateSignature: Date;
  dateExpiration?: Date;
  parentId?: number;
  documentId?: number;
  notes?: string;
  partenaires: OrganisationResume[];
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
}
