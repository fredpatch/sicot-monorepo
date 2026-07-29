import { useQuery } from '@tanstack/react-query';

import { organisationsApi } from '@/lib/organisations.api';
import { PARTENAIRES_PAGE_SIZE } from '../partenaires.constants';
import type {
  Contact,
  ContactQualityFilter,
  OrganisationsListResponse,
  OrganisationSortField,
  OrganisationStatusFilter,
  OrganisationTypeFiltre,
} from '../partenaires.types';

interface UseOrganisationsQueryParams {
  search: string;
  pays: string;
  region: string;
  type: OrganisationTypeFiltre;
  statut?: OrganisationStatusFilter;
  contactQuality?: ContactQualityFilter;
  page: number;
  sortBy?: OrganisationSortField;
  sortOrder?: 'asc' | 'desc';
}

export function useOrganisationsQuery({
  search,
  pays,
  region,
  type,
  statut = 'tous',
  contactQuality = '',
  page,
  sortBy,
  sortOrder,
}: UseOrganisationsQueryParams) {
  return useQuery({
    queryKey: ['organisations', search, pays, region, type, statut, contactQuality, page, sortBy, sortOrder],
    queryFn: async () => {
      const response = await organisationsApi.lister({
        search: search || undefined,
        pays: pays || undefined,
        region: region || undefined,
        type: type !== 'tous' ? type : undefined,
        actif: statut === 'tous' ? undefined : statut === 'actif',
        contactQuality: contactQuality || undefined,
        page,
        pageSize: PARTENAIRES_PAGE_SIZE,
        sortBy,
        sortOrder,
      });
      return response.data as OrganisationsListResponse;
    },
  });
}

export function usePaysDisponiblesQuery() {
  return useQuery({
    queryKey: ['organisations-pays'],
    queryFn: async () => {
      const response = await organisationsApi.getPays();
      return response.data as string[];
    },
  });
}

export function useRegionsDisponiblesQuery() {
  return useQuery({
    queryKey: ['organisations-regions'],
    queryFn: async () => {
      const response = await organisationsApi.getRegions();
      return response.data as string[];
    },
  });
}

export function useContactsOrganisationQuery(organisationId?: number) {
  return useQuery({
    queryKey: ['contacts', organisationId],
    queryFn: async () => {
      if (!organisationId) return [];
      const response = await organisationsApi.listerContacts(organisationId);
      return response.data as Contact[];
    },
    enabled: !!organisationId,
  });
}
