// packages/client/src/pages/portal/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/portal.api';
import { PORTAL_PAGE_SIZE } from '../portal.constants';
import type { DocumentPortail, PortailAggregates } from '../portal.types';

export function usePortalDocumentsQuery(params: {
  search: string;
  categorie: string;
  page: number;
}) {
  return useQuery({
    queryKey: ['portail-documents', params.search, params.categorie, params.page],
    queryFn: async () => {
      const res = await portalApi.lister({
        search: params.search || undefined,
        categorie: params.categorie || undefined,
        page: params.page,
        pageSize: PORTAL_PAGE_SIZE,
      });
      return res.data as { data: DocumentPortail[]; total: number };
    },
  });
}

export function usePortalAggregatesQuery() {
  return useQuery({
    queryKey: ['portail-aggregates'],
    queryFn: async () => {
      const res = await portalApi.getAggregates();
      return res.data as PortailAggregates;
    },
  });
}
