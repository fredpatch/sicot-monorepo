// packages/client/src/pages/admin/hooks/queries.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { parametresApi } from '@/lib/parametres.api';
import { jobsApi, traductionsApi } from '@/lib/api';
import { analyticsApi } from '@/lib/analytics.api';
import type {
  Parametre,
  JobDisponible,
  StatutGemini,
  StatutMoteurTraduction,
  JobExecution,
} from '../admin.types';

export function useParametresQuery() {
  return useQuery({
    queryKey: ['parametres'],
    queryFn: async () => {
      const res = await parametresApi.lister();
      return res.data as Parametre[];
    },
  });
}

export function useJobsQuery() {
  return useQuery({
    queryKey: ['jobs-disponibles'],
    queryFn: async () => {
      const res = await jobsApi.lister();
      return res.data as JobDisponible[];
    },
  });
}

export function useMoteurStatusQuery() {
  return useQuery({
    queryKey: ['moteur-status'],
    queryFn: async () => {
      const res = await traductionsApi.moteurStatus();
      return res.data as StatutMoteurTraduction;
    },
  });
}

// Réduit pour garder chaque page courte maintenant que les lignes sont
// compactes (une ligne par exécution, détail sur clic) — voir JobHistoryTable.
const JOB_HISTORY_PAGE_SIZE = 8;

export interface JobHistoryFilters {
  jobCle: string;
  source: string;
  succes: string;
  page: number;
}

export function useJobHistoryQuery({ jobCle, source, succes, page }: JobHistoryFilters) {
  return useQuery({
    queryKey: ['jobs-historique', jobCle, source, succes, page],
    queryFn: async () => {
      const res = await jobsApi.historique({
        jobCle: jobCle || undefined,
        source: source ? (source as 'manuel' | 'cron') : undefined,
        succes: succes ? succes === 'true' : undefined,
        page,
        pageSize: JOB_HISTORY_PAGE_SIZE,
      });
      return res.data as { data: JobExecution[]; total: number };
    },
    placeholderData: keepPreviousData,
  });
}

export { JOB_HISTORY_PAGE_SIZE };

// Se rafraîchit seule - pas besoin de recharger la page pour voir l'évolution
// du jour (même intervalle que l'ancienne implémentation).
export function useGeminiUsageQuery() {
  return useQuery({
    queryKey: ['gemini-usage'],
    queryFn: async () => {
      const res = await analyticsApi.getStatutGemini();
      return res.data as StatutGemini;
    },
    refetchInterval: 60_000,
  });
}
