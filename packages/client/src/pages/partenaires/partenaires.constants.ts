import type { OrganisationTypeFiltre } from './partenaires.types';

export const TYPES_FILTER: { value: OrganisationTypeFiltre; label: string }[] = [
  { value: 'tous', label: 'Tous les types' },
  { value: 'anac_etrangere', label: 'ANAC étrangère' },
  { value: 'organisation_internationale', label: 'Organisation internationale' },
  { value: 'autre', label: 'Autre' },
];

export const TYPES_FORM = [
  { value: 'anac_etrangere', label: 'ANAC étrangère' },
  { value: 'organisation_internationale', label: 'Organisation internationale' },
  { value: 'autre', label: 'Autre' },
];
