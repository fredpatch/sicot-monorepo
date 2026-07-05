// packages/client/src/pages/analytics/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/analytics.api';
import type {
  Periode,
  GlobalAnalytics,
  AccordsAnalytics,
  CourriersAnalytics,
  MissionsAnalytics,
  TraductionAnalytics,
  DemandesAnalytics,
  DocumentsAnalytics,
  GlossaireAnalytics,
  RapportHistorique,
} from '../analytics.types';

export function useGlobalAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-global', periode],
    queryFn: async () => {
      const res = await analyticsApi.global(periode);
      return res.data as GlobalAnalytics;
    },
  });
}

export function useAccordsAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-accords', periode],
    queryFn: async () => {
      const res = await analyticsApi.accords(periode);
      return res.data as AccordsAnalytics;
    },
  });
}

export function useCourriersAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-courriers', periode],
    queryFn: async () => {
      const res = await analyticsApi.courriers(periode);
      return res.data as CourriersAnalytics;
    },
  });
}

export function useMissionsAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-missions', periode],
    queryFn: async () => {
      const res = await analyticsApi.missions(periode);
      return res.data as MissionsAnalytics;
    },
  });
}

export function useTraductionsAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-traductions', periode],
    queryFn: async () => {
      const res = await analyticsApi.traductions(periode);
      return res.data as TraductionAnalytics;
    },
  });
}

export function useDemandesAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-demandes', periode],
    queryFn: async () => {
      const res = await analyticsApi.demandes(periode);
      return res.data as DemandesAnalytics;
    },
  });
}

export function useDocumentsAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-documents', periode],
    queryFn: async () => {
      const res = await analyticsApi.documents(periode);
      return res.data as DocumentsAnalytics;
    },
  });
}

export function useGlossaireAnalyticsQuery(periode: Periode) {
  return useQuery({
    queryKey: ['analytics-glossaire', periode],
    queryFn: async () => {
      const res = await analyticsApi.glossaire(periode);
      return res.data as GlossaireAnalytics;
    },
  });
}

export function useRapportsHistoriqueQuery() {
  return useQuery({
    queryKey: ['analytics-rapports'],
    queryFn: async () => {
      const res = await analyticsApi.listerRapports();
      return res.data as RapportHistorique[];
    },
  });
}
