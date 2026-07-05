// packages/client/src/pages/audit/hooks/useAuditQueries.ts
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/audit.api';
import type { AuditLog } from '../audit.types';

const PAGE_SIZE = 10;

interface UseAuditLogsQueryParams {
  module: string;
  action: string;
  dateDebut: string;
  dateFin: string;
  page: number;
}

export function useAuditLogsQuery({
  module,
  action,
  dateDebut,
  dateFin,
  page,
}: UseAuditLogsQueryParams) {
  return useQuery({
    queryKey: ['audit', module, action, dateDebut, dateFin, page],
    queryFn: async () => {
      const res = await auditApi.lister({
        module: module || undefined,
        action: action || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res.data as { data: AuditLog[]; total: number };
    },
  });
}

export function useAuditModulesQuery() {
  return useQuery({
    queryKey: ['audit-modules'],
    queryFn: async () => {
      const res = await auditApi.getModules();
      return res.data as string[];
    },
  });
}

export function useAuditActionsQuery() {
  return useQuery({
    queryKey: ['audit-actions'],
    queryFn: async () => {
      const res = await auditApi.getActions();
      return res.data as string[];
    },
  });
}

export { PAGE_SIZE };
