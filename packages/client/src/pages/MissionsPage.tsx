import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { missionsApi } from '@/lib/missions.api';
import { MISSION_PAGE_SIZE } from './missions/mission.constants';
import type { Mission, MissionListResponse, MissionsAggregates } from './missions/mission.types';
import { MissionsFilters } from './missions/components/MissionsFilters';
import {
  MissionsRegistryMobileCards,
  MissionsRegistryTable,
} from './missions/components/MissionsRegistryTable';
import { MissionsSummaryCards } from './missions/components/MissionsSummaryCards';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function MissionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const statut = searchParams.get('statut') ?? '';
  const pays = searchParams.get('pays') ?? '';
  const confirmationLogistique = searchParams.get('logistique') ?? '';
  const rapportStatut = searchParams.get('rapport') ?? '';
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

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      statut: statut ? (statut as Mission['statut']) : undefined,
      pays: pays || undefined,
      confirmationLogistique: confirmationLogistique
        ? (confirmationLogistique as Mission['confirmationLogistique'])
        : undefined,
      rapportStatut: rapportStatut
        ? (rapportStatut as 'disponible' | 'manquant')
        : undefined,
      page,
      pageSize: MISSION_PAGE_SIZE,
    }),
    [debouncedSearch, statut, pays, confirmationLogistique, rapportStatut, page]
  );

  const missionsQuery = useQuery({
    queryKey: ['missions', queryParams],
    queryFn: async () => {
      const res = await missionsApi.lister(queryParams);
      return res.data as MissionListResponse;
    },
  });

  const aggregatesQuery = useQuery({
    queryKey: ['missions-aggregates'],
    queryFn: async () => {
      const res = await missionsApi.aggregates();
      return res.data as MissionsAggregates;
    },
  });

  const missions = missionsQuery.data?.data ?? [];
  const totalPages = missionsQuery.data ? Math.ceil(missionsQuery.data.total / MISSION_PAGE_SIZE) : 0;
  const hasFilters = Boolean(debouncedSearch || statut || pays || confirmationLogistique || rapportStatut);

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
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Missions</h2>
          <p className="mt-1 text-sm text-anac-muted">
            Planifiez et suivez les missions et déplacements officiels.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => navigate('/missions/new')} className="gap-2 bg-anac-blue">
            <Plus size={14} aria-hidden="true" />
            Nouvelle mission
          </Button>
        </div>
      </header>

      <MissionsSummaryCards aggregates={aggregatesQuery.data} />

      <MissionsFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        statut={statut}
        onStatutChange={(value) => setFilter('statut', value)}
        pays={pays}
        onPaysChange={(value) => setFilter('pays', value)}
        confirmationLogistique={confirmationLogistique}
        onLogistiqueChange={(value) => setFilter('logistique', value)}
        rapportStatut={rapportStatut}
        onRapportChange={(value) => setFilter('rapport', value)}
        resultCount={missionsQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {missionsQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement des missions...
        </div>
      ) : missionsQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger les missions.</p>
          <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => missionsQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : missions.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {hasFilters
              ? 'Aucune mission ne correspond aux filtres sélectionnés.'
              : 'Aucune mission enregistrée.'}
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Modifiez les filtres ou réinitialisez la recherche.'
              : 'Planifiez la première mission ou le premier déplacement officiel.'}
          </p>
          {hasFilters ? (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          ) : (
            <Button type="button" onClick={() => navigate('/missions/new')} className="gap-2 bg-anac-blue">
              <Plus size={14} aria-hidden="true" />
              Nouvelle mission
            </Button>
          )}
        </div>
      ) : (
        <>
          <MissionsRegistryTable missions={missions} />
          <MissionsRegistryMobileCards missions={missions} />
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
