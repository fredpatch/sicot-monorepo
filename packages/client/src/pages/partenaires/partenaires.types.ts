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
}

export interface Organisation {
  id: number;
  nom: string;
  pays: string;
  region?: string;
  type: string;
  actif: boolean;
  notes?: string;
  contacts?: Contact[];
  contactPrincipal?: Contact;
  contactsActifsCount?: number;
  contactsTotalCount?: number;
  accordsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type OrganisationTypeFiltre =
  | 'tous'
  | 'anac_etrangere'
  | 'organisation_internationale'
  | 'autre';

export type OrganisationSortField = 'nom' | 'type' | 'pays' | 'region' | 'actif';

export type OrganisationStatusFilter = 'tous' | 'actif' | 'inactif';

export type ContactQualityFilter =
  | ''
  | 'avec_principal'
  | 'avec_contact_sans_principal'
  | 'sans_contact_actif';

export interface OrganisationsAggregates {
  total: number;
  active: number;
  inactive: number;
  withActiveContact: number;
  withoutActiveContact: number;
  representedCountries: number;
}

export interface OrganisationsListResponse {
  data: Organisation[];
  total: number;
  aggregates?: OrganisationsAggregates;
}
