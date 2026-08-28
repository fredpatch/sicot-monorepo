import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { organisationsApi } from '@/lib/organisations.api';
import { PARTENAIRES_PAGE_SIZE } from './partenaires/partenaires.constants';
import { canManagePartenaires } from './partenaires/partenaires.permissions';
import type {
  ContactQualityFilter,
  OrganisationsListResponse,
  OrganisationStatusFilter,
  OrganisationTypeFiltre,
} from './partenaires/partenaires.types';
import { PartenairesFiltres } from './partenaires/components/PartenairesFiltres';
import {
  PartenairesRegistryMobileCards,
  PartenairesRegistryTable,
} from './partenaires/components/PartenairesRegistryTable';
import { PartenairesSummaryCards } from './partenaires/components/PartenairesSummaryCards';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function PartenairesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManagePartenaires(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const type = (searchParams.get('type') ?? 'tous') as OrganisationTypeFiltre;
  const pays = searchParams.get('pays') ?? '';
  const region = searchParams.get('region') ?? '';
  const statut = (searchParams.get('statut') ?? 'tous') as OrganisationStatusFilter;
  const contactQuality = (searchParams.get('contacts') ?? '') as ContactQualityFilter;
  const sortBy = searchParams.get('sortBy') as 'nom' | 'type' | 'pays' | 'region' | 'actif' | null;
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc') as 'asc' | 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const current = searchParams.get('search') ?? '';
    if (debouncedSearch === current) return;
    updateParams({ search: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      type: type !== 'tous' ? type : undefined,
      pays: pays || undefined,
      region: region || undefined,
      actif: statut === 'tous' ? undefined : statut === 'actif',
      contactQuality: contactQuality || undefined,
      page,
      pageSize: PARTENAIRES_PAGE_SIZE,
      sortBy: sortBy ?? undefined,
      sortOrder: sortBy ? sortOrder : undefined,
    }),
    [contactQuality, debouncedSearch, page, pays, region, sortBy, sortOrder, statut, type]
  );

  const partenairesQuery = useQuery({
    queryKey: ['organisations-registry', queryParams],
    queryFn: async () => {
      const response = await organisationsApi.lister(queryParams);
      return response.data as OrganisationsListResponse;
    },
  });

  const paysQuery = useQuery({
    queryKey: ['organisations-pays'],
    queryFn: async () => {
      const response = await organisationsApi.getPays();
      return response.data as string[];
    },
  });

  const regionsQuery = useQuery({
    queryKey: ['organisations-regions'],
    queryFn: async () => {
      const response = await organisationsApi.getRegions();
      return response.data as string[];
    },
  });

  const organisations = partenairesQuery.data?.data ?? [];
  const totalPages = partenairesQuery.data
    ? Math.ceil(partenairesQuery.data.total / PARTENAIRES_PAGE_SIZE)
    : 0;
  const hasFilters = Boolean(debouncedSearch || type !== 'tous' || pays || region || statut !== 'tous' || contactQuality);

  function resetFilters() {
    setSearch('');
    setSearchParams({}, { replace: true });
  }

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value || null, page: null });
  }

  function sortRegistry(field: 'nom' | 'type' | 'pays' | 'region' | 'actif') {
    const nextOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: null });
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Partenaires</h2>
          <p className="mt-1 text-sm text-anac-muted">
            Gérez les organisations et partenaires de coopération internationale.
          </p>
        </div>
        {canManage && (
          <Button type="button" onClick={() => navigate('/partenaires/new')} className="gap-2 bg-anac-blue">
            <Plus size={14} aria-hidden="true" />
            Nouveau partenaire
          </Button>
        )}
      </header>

      <PartenairesSummaryCards aggregates={partenairesQuery.data?.aggregates} />

      <PartenairesFiltres
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        type={type}
        onTypeChange={(value) => setFilter('type', value === 'tous' ? '' : value)}
        pays={pays}
        onPaysChange={(value) => setFilter('pays', value)}
        paysDisponibles={paysQuery.data}
        region={region}
        onRegionChange={(value) => setFilter('region', value)}
        regionsDisponibles={regionsQuery.data}
        statut={statut}
        onStatutChange={(value) => setFilter('statut', value === 'tous' ? '' : value)}
        contactQuality={contactQuality}
        onContactQualityChange={(value) => setFilter('contacts', value)}
        resultCount={partenairesQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {partenairesQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement des partenaires...
        </div>
      ) : partenairesQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger les partenaires.</p>
          <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
          <Button type="button" variant="outline" onClick={() => partenairesQuery.refetch()} className="gap-2">
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : organisations.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {hasFilters
              ? 'Aucun partenaire ne correspond aux filtres sélectionnés'
              : 'Aucun partenaire enregistré'}
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Modifiez les filtres ou réinitialisez la recherche.'
              : canManage
                ? 'Créez la première organisation partenaire.'
                : 'Aucun partenaire n\'a encore été enregistré.'}
          </p>
          {hasFilters ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          ) : canManage ? (
            <Button type="button" onClick={() => navigate('/partenaires/new')} className="gap-2 bg-anac-blue">
              <Plus size={14} aria-hidden="true" />
              Nouveau partenaire
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <PartenairesRegistryTable
            organisations={organisations}
            canManage={canManage}
            sortBy={sortBy ?? undefined}
            sortOrder={sortOrder}
            onSort={sortRegistry}
          />
          <PartenairesRegistryMobileCards organisations={organisations} />
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
