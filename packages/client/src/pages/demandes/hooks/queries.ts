// packages/client/src/pages/demandes/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { demandesApi, type DemandeStatut, type DemandePriorite } from '@/lib/demandes.api';
import { documentsApi } from '@/lib/documents.api';
import type { Demande, DocumentDisponible } from '../requests.types';

const PAGE_SIZE = 10;

interface UseDemandesQueryParams {
  statut: string;
  priorite: string;
  page: number;
}

export function useDemandesQuery({ statut, priorite, page }: UseDemandesQueryParams) {
  return useQuery({
    queryKey: ['demandes', statut, priorite, page],
    queryFn: async () => {
      const res = await demandesApi.lister({
        statut: statut ? (statut as DemandeStatut) : undefined,
        priorite: priorite ? (priorite as DemandePriorite) : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res.data as { data: Demande[]; total: number };
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

export { PAGE_SIZE };
