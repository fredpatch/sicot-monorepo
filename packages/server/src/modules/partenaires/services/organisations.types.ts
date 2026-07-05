export type OrganisationType = 'anac_etrangere' | 'organisation_internationale' | 'autre';

export interface CreateOrganisationParams {
  nom: string;
  pays: string;
  region?: string;
  type: OrganisationType;
  notes?: string;
  createdByUserId: number;
}

export interface UpdateOrganisationParams {
  nom?: string;
  pays?: string;
  region?: string;
  type?: OrganisationType;
  actif?: boolean;
  notes?: string;
  updatedByUserId: number;
}

export type OrganisationSortBy = 'nom' | 'type' | 'pays' | 'region' | 'actif' | 'createdAt';
export type OrganisationSortOrder = 'asc' | 'desc';

export interface OrganisationFilters {
  search?: string;
  pays?: string;
  region?: string;
  type?: OrganisationType;
  actif?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: OrganisationSortBy;
  sortOrder?: OrganisationSortOrder;
}

export interface CreateContactParams {
  organisationId: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  principal?: boolean;
  createdByUserId: number;
}

export interface UpdateContactParams {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  poste?: string;
  actif?: boolean;
  updatedByUserId: number;
}

export interface OrganisationView {
  id: number;
  nom: string;
  pays: string;
  region?: string;
  type: OrganisationType;
  actif: boolean;
  notes?: string;
  contacts?: ContactView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactView {
  id: number;
  organisationId: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  principal: boolean;
  actif: boolean;
  createdAt: Date;
}
