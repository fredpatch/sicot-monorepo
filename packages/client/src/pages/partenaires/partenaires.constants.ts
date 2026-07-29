import type { ContactQualityFilter, OrganisationStatusFilter, OrganisationTypeFiltre } from './partenaires.types';

export const PARTENAIRES_PAGE_SIZE = 8;

export const TYPES_FILTER: { value: OrganisationTypeFiltre; label: string }[] = [
  { value: 'tous', label: 'Tous les types' },
  { value: 'anac_etrangere', label: 'ANAC étrangère' },
  { value: 'organisation_internationale', label: 'Organisation internationale' },
  { value: 'autre', label: 'Autre' },
];

export const TYPES_FORM = [
  { value: 'anac_etrangere', label: 'ANAC étrangère' },
  { value: 'organisation_internationale', label: 'Organisation internationale' },
  { value: 'autre', label: 'Autre organisation' },
];

export const STATUS_FILTER: { value: OrganisationStatusFilter; label: string }[] = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'actif', label: 'Actifs' },
  { value: 'inactif', label: 'Inactifs' },
];

export const CONTACT_QUALITY_OPTIONS: { value: ContactQualityFilter; label: string }[] = [
  { value: '', label: 'Tous les contacts' },
  { value: 'avec_principal', label: 'Avec contact principal' },
  { value: 'avec_contact_sans_principal', label: 'Contact sans principal' },
  { value: 'sans_contact_actif', label: 'Sans contact actif' },
];
