// packages/client/src/pages/utilisateurs/hooks/queries.ts
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/users.api';
import { personnelAnacApi } from '@/lib/personnel-anac.api';
import type { UserRole } from '@sicot/shared';
import type { Utilisateur, PersonnelAnacResultat } from '../users.types';

const PAGE_SIZE = 10;

interface UseUtilisateursQueryParams {
  search: string;
  role: string;
  actif: string;
  page: number;
}

export function useUtilisateursQuery({ search, role, actif, page }: UseUtilisateursQueryParams) {
  return useQuery({
    queryKey: ['utilisateurs', search, role, actif, page],
    queryFn: async () => {
      const res = await usersApi.lister({
        search: search || undefined,
        role: role ? (role as UserRole) : undefined,
        actif: actif ? actif === 'true' : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res.data as { data: Utilisateur[]; total: number };
    },
  });
}

interface UsePersonnelAnacQueryParams {
  page: number;
  q: string;
}

export function usePersonnelAnacQuery({ page, q }: UsePersonnelAnacQueryParams) {
  return useQuery({
    queryKey: ['personnel-anac', page, q],
    queryFn: async () => {
      if (q.trim().length >= 2) {
        const res = await personnelAnacApi.rechercher(q.trim());
        return { data: res.data.data as PersonnelAnacResultat[], total: res.data.data.length, page: 1, limit: 20 };
      }
      const res = await personnelAnacApi.lister({ page, limit: PAGE_SIZE });
      return res.data as { data: PersonnelAnacResultat[]; total: number; page: number; limit: number };
    },
    retry: false, // évite de marteler l'API ANAC si elle est indisponible (réseau Tailscale)
  });
}

export { PAGE_SIZE };