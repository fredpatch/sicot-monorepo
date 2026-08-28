import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { courriersApi } from '@/lib/courriers.api';
import { COURRIER_PAGE_SIZE } from './courriers/courrier.constants';
import type {
  Courrier,
  CourrierDirection,
  CourrierListResponse,
  CourrierSuiviStatut,
  CourriersAggregates,
} from './courriers/courrier.types';
import { CourriersFilters } from './courriers/components/CourriersFilters';
import {
  CourriersRegistryMobileCards,
  CourriersRegistryTable,
} from './courriers/components/CourriersRegistryTable';
import { CourriersSummaryCards } from './courriers/components/CourriersSummaryCards';
import { getPeriodeRange } from './courriers/courrier.utils';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function CourriersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const direction = searchParams.get('direction') ?? '';
  const statut = searchParams.get('statut') ?? '';
  // Derived filter - attendue/en_depassement/repondu, not a stored field.
  // See courrier.constants.ts's COURRIER_RESPONSE_FILTER_OPTIONS.
  const reponse = searchParams.get('reponse') ?? '';
  const periode = searchParams.get('periode') ?? '';
  const periodeDebut = searchParams.get('periodeDebut') ?? '';
  const periodeFin = searchParams.get('periodeFin') ?? '';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const periodeRange = useMemo(
    () => getPeriodeRange(periode, { dateDebut: periodeDebut, dateFin: periodeFin }),
    [periode, periodeDebut, periodeFin]
  );

  const queryParams = useMemo(() => {
    const base = {
      search: debouncedSearch || undefined,
      direction: direction ? (direction as CourrierDirection) : undefined,
      statut: statut ? (statut as CourrierSuiviStatut) : undefined,
      dateDebut: periodeRange.dateDebut,
      dateFin: periodeRange.dateFin,
      page,
      pageSize: COURRIER_PAGE_SIZE,
    };

    if (reponse === 'attendue') {
      return { ...base, reponseRequise: 'oui' as const, statut: 'en_attente' as const };
    }
    if (reponse === 'en_depassement') {
      return { ...base, enDepassement: true };
    }
    if (reponse === 'repondu') {
      return { ...base, statut: 'repondu' as const };
    }
    return base;
  }, [debouncedSearch, direction, statut, reponse, periodeRange, page]);

  const courriersQuery = useQuery({
    queryKey: ['courriers', queryParams],
    queryFn: async () => {
      const res = await courriersApi.lister(queryParams);
      return res.data as CourrierListResponse;
    },
  });

  const aggregatesQuery = useQuery({
    queryKey: ['courriers-aggregates'],
    queryFn: async () => {
      const res = await courriersApi.aggregates();
      return res.data as CourriersAggregates;
    },
  });

  const courriers: Courrier[] = courriersQuery.data?.data ?? [];
  const totalPages = courriersQuery.data
    ? Math.ceil(courriersQuery.data.total / COURRIER_PAGE_SIZE)
    : 0;
  const hasFilters = Boolean(debouncedSearch || direction || statut || reponse || periode);

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
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Courriers</h2>
          <p className="mt-1 text-sm text-anac-muted">
            Gérez les courriers entrants et sortants ainsi que leur suivi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => navigate('/courriers/new')}
            className="gap-2 bg-anac-blue"
          >
            <Plus size={14} aria-hidden="true" />
            Nouveau courrier
          </Button>
        </div>
      </header>

      <CourriersSummaryCards aggregates={aggregatesQuery.data} />

      <CourriersFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        direction={direction}
        onDirectionChange={(value) => setFilter('direction', value)}
        statut={statut}
        onStatutChange={(value) => setFilter('statut', value)}
        reponse={reponse}
        onReponseChange={(value) => setFilter('reponse', value)}
        periode={periode}
        onPeriodeChange={(value) => setFilter('periode', value)}
        periodeDebut={periodeDebut}
        onPeriodeDebutChange={(value) => setFilter('periodeDebut', value)}
        periodeFin={periodeFin}
        onPeriodeFinChange={(value) => setFilter('periodeFin', value)}
        resultCount={courriersQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {courriersQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement des courriers...
        </div>
      ) : courriersQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger les courriers.</p>
          <p className="text-sm text-anac-muted">
            Vérifiez la connexion au serveur puis réessayez.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => courriersQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : courriers.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {hasFilters
              ? 'Aucun courrier ne correspond aux filtres sélectionnés.'
              : 'Aucun courrier enregistré.'}
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Modifiez les filtres ou réinitialisez la recherche.'
              : 'Enregistrez le premier courrier entrant ou sortant.'}
          </p>
          {hasFilters ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => navigate('/courriers/new')}
              className="gap-2 bg-anac-blue"
            >
              <Plus size={14} aria-hidden="true" />
              Nouveau courrier
            </Button>
          )}
        </div>
      ) : (
        <>
          <CourriersRegistryTable courriers={courriers} />
          <CourriersRegistryMobileCards courriers={courriers} />
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
