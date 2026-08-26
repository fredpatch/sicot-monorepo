// packages/client/src/pages/demandes/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import {
  demandesApi,
  type DemandeStatut,
  type DemandePriorite,
  type DemandeDirection,
  type DemandesAggregates,
} from '@/lib/demandes.api';
import { documentsApi } from '@/lib/documents.api';
import type { Demande, DocumentDisponible } from '../requests.types';
import { REQUEST_PAGE_SIZE } from '../requests.constants';

interface UseDemandesQueryParams {
  statut: string;
  priorite: string;
  direction?: string;
  demandeurId?: number;
  traducteurId?: number;
  search: string;
  page: number;
}

export function useDemandesQuery({
  statut,
  priorite,
  direction,
  demandeurId,
  traducteurId,
  search,
  page,
}: UseDemandesQueryParams) {
  return useQuery({
    queryKey: ['demandes', statut, priorite, direction, demandeurId, traducteurId, search, page],
    queryFn: async () => {
      const res = await demandesApi.lister({
        statut: statut ? (statut as DemandeStatut) : undefined,
        priorite: priorite ? (priorite as DemandePriorite) : undefined,
        direction: direction ? (direction as DemandeDirection) : undefined,
        demandeurId,
        traducteurId,
        search: search || undefined,
        page,
        pageSize: REQUEST_PAGE_SIZE,
      });
      return res.data as { data: Demande[]; total: number };
    },
  });
}

export function useDemandesAggregatesQuery() {
  return useQuery({
    queryKey: ['demandes-aggregates'],
    queryFn: async () => {
      const res = await demandesApi.aggregates();
      return res.data as DemandesAggregates;
    },
  });
}

export function useDocumentsOCRTraiteQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['documents-ocr-traite'],
    queryFn: async () => {
      const res = await documentsApi.lister({ statutOCR: 'traite', pageSize: 100 });
      return res.data as { data: DocumentDisponible[] };
    },
    enabled,
  });
}
