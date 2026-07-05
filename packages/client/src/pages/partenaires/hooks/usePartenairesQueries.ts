import { useQuery } from '@tanstack/react-query';

import { organisationsApi } from '@/lib/organisations.api';
import type { Contact, Organisation, OrganisationSortField, OrganisationTypeFiltre } from '../partenaires.types';

interface UseOrganisationsQueryParams {
  search: string;
  pays: string;
  region: string;
  type: OrganisationTypeFiltre;
  page: number;
  sortBy?: OrganisationSortField;
  sortOrder?: 'asc' | 'desc';
}

export function useOrganisationsQuery({
  search,
  pays,
  region,
  type,
  page,
  sortBy,
  sortOrder,
}: UseOrganisationsQueryParams) {
  return useQuery({
    queryKey: ['organisations', search, pays, region, type, page, sortBy, sortOrder],
    queryFn: async () => {
      const response = await organisationsApi.lister({
        search: search || undefined,
        pays: pays || undefined,
        region: region || undefined,
        type: type !== 'tous' ? type : undefined,
        page,
        pageSize: 20,
        sortBy,
        sortOrder,
      });
      return response.data as { data: Organisation[]; total: number };
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
