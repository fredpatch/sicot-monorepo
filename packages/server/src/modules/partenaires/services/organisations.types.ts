export type OrganisationType = 'anac_etrangere' | 'organisation_internationale' | 'autre';

export interface CreateOrganisationParams {
  nom: string;
  pays: string;
  region?: string;
  type: OrganisationType;
  actif?: boolean;
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
export type ContactQualityFilter =
  | 'avec_principal'
  | 'avec_contact_sans_principal'
  | 'sans_contact_actif';

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
  contactQuality?: ContactQualityFilter;
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
  contactPrincipal?: ContactView;
  contactsActifsCount?: number;
  contactsTotalCount?: number;
  accordsCount?: number;
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

export interface OrganisationsAggregates {
  total: number;
  active: number;
  inactive: number;
  withActiveContact: number;
  withoutActiveContact: number;
  representedCountries: number;
}
