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
  createdAt: string;
}

export type OrganisationTypeFiltre =
  | 'tous'
  | 'anac_etrangere'
  | 'organisation_internationale'
  | 'autre';

export type OrganisationSortField = 'nom' | 'type' | 'pays' | 'region' | 'actif';
