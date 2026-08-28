import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { accordsApi, type AccordStatut } from '@/lib/accords.api';
import { organisationsApi } from '@/lib/organisations.api';
import { canManageAccords } from './accords/accord.permissions';
import AccordDetail from './accords/components/AccordDetail';
import { ACCORD_EXPIRY_WARNING_DAYS, ACCORD_PAGE_SIZE } from './accords/accord.constants';
import type { AccordListResponse, ExpiryFilter, OrganisationOption } from './accords/accord.types';
import { AccordFilters } from './accords/components/AccordFilters';
import {
  AccordRegistryMobileCards,
  AccordRegistryTable,
} from './accords/components/AccordRegistryTable';
import { AccordSummaryCards } from './accords/components/AccordSummaryCards';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

function getExpiryDateParam(expiry: ExpiryFilter) {
  if (!expiry || expiry === 'expired') return undefined;
  const date = new Date();
  date.setDate(date.getDate() + parseInt(expiry, 10));
  return date.toISOString();
}

export default function AccordsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManageAccords(user?.role);
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const accordIdSelectionne = id ? parseInt(id, 10) : null;

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const statut = searchParams.get('statut') ?? '';
  const partenaireId = searchParams.get('partenaireId') ?? '';
  const expiry = (searchParams.get('echeance') ?? '') as ExpiryFilter;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const current = searchParams.get('search') ?? '';
    if (debouncedSearch === current) return;
    updateParams({ search: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      statut: expiry === 'expired' ? ('expire' as AccordStatut) : statut ? (statut as AccordStatut) : undefined,
      partenairesId: partenaireId ? parseInt(partenaireId, 10) : undefined,
      expirantAvant: getExpiryDateParam(expiry),
      page,
      pageSize: ACCORD_PAGE_SIZE,
    }),
    [debouncedSearch, expiry, page, partenaireId, statut]
  );

  const accordsQuery = useQuery({
    queryKey: ['accords', queryParams],
    queryFn: async () => {
      const res = await accordsApi.lister(queryParams);
      return res.data as AccordListResponse;
    },
    enabled: !accordIdSelectionne,
  });

  const orgsQuery = useQuery({
    queryKey: ['organisations-filtre-accords'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: OrganisationOption[]; total: number };
    },
  });

  const totalQuery = useAccordCount({});
  const activeQuery = useAccordCount({ statut: 'actif' });
  const expiredQuery = useAccordCount({ statut: 'expire' });
  const suspendedQuery = useAccordCount({ statut: 'suspendu' });
  const renewalQuery = useQuery({
    queryKey: ['accords-summary-renewal', ACCORD_EXPIRY_WARNING_DAYS],
    queryFn: async () => {
      const res = await accordsApi.expirantBientot(ACCORD_EXPIRY_WARNING_DAYS);
      return Array.isArray(res.data) ? res.data.length : 0;
    },
    enabled: !accordIdSelectionne,
  });

  if (accordIdSelectionne) {
    return (
      <AccordDetail
        accordId={accordIdSelectionne}
        canManage={canManage}
        onModifier={() => navigate(`/accords/${accordIdSelectionne}/edit`)}
      />
    );
  }

  const accords = accordsQuery.data?.data ?? [];
  const totalPages = accordsQuery.data ? Math.ceil(accordsQuery.data.total / ACCORD_PAGE_SIZE) : 0;
  const hasFilters = Boolean(debouncedSearch || statut || partenaireId || expiry);

  function resetFilters() {
    setSearch('');
    setSearchParams({}, { replace: true });
  }

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value || null, page: null });
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Accords</h2>
          <p className="mt-1 text-sm text-anac-muted">
            Gérez les accords et conventions de coopération internationale.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button type="button" onClick={() => navigate('/accords/new')} className="gap-2 bg-anac-blue">
              <Plus size={14} aria-hidden="true" />
              Nouvel accord
            </Button>
          </div>
        )}
      </header>

      <AccordSummaryCards
        total={totalQuery.data}
        actifs={activeQuery.data}
        renouveler={renewalQuery.data}
        expires={expiredQuery.data}
        suspendus={suspendedQuery.data}
      />

      <AccordFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        statut={statut}
        onStatutChange={(value) => setFilter('statut', value)}
        partenaireId={partenaireId}
        onPartenaireChange={(value) => setFilter('partenaireId', value)}
        expiry={expiry}
        onExpiryChange={(value) => setFilter('echeance', value)}
        organisations={orgsQuery.data?.data ?? []}
        resultCount={accordsQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {accordsQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement des accords...
        </div>
      ) : accordsQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger les accords.</p>
          <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
          <Button type="button" variant="outline" onClick={() => accordsQuery.refetch()} className="gap-2">
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : accords.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {hasFilters ? 'Aucun accord ne correspond aux filtres sélectionnés' : 'Aucun accord enregistré'}
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Modifiez les filtres ou réinitialisez la recherche.'
              : canManage
                ? 'Créez le premier accord de coopération internationale.'
                : 'Aucun accord n\'a encore été enregistré.'}
          </p>
          {hasFilters ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          ) : canManage ? (
            <Button type="button" onClick={() => navigate('/accords/new')} className="gap-2 bg-anac-blue">
              <Plus size={14} aria-hidden="true" />
              Nouvel accord
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <AccordRegistryTable accords={accords} canManage={canManage} />
          <AccordRegistryMobileCards accords={accords} />
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-anac-border bg-white px-4 py-3">
          <p className="text-sm text-anac-muted">
            Page <strong className="text-anac-navy">{page}</strong> sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: Math.max(1, page - 1).toString() })}
              disabled={page <= 1}
              aria-label="Page précédente"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: Math.min(totalPages, page + 1).toString() })}
              disabled={page >= totalPages}
              aria-label="Page suivante"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function useAccordCount(params: { statut?: AccordStatut }) {
  return useQuery({
    queryKey: ['accords-summary-count', params],
    queryFn: async () => {
      const res = await accordsApi.lister({ ...params, page: 1, pageSize: 1 });
      return (res.data as AccordListResponse).total;
    },
  });
}
