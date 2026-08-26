// packages/client/src/pages/MesDemandesPage.tsx
//
// Agent-restricted view of their own translation requests — demandeurId
// scope, full registry table + workspace, reusing the same components as
// the admin Demandes registry. Promotes what used to be a link-out from
// Mon espace (`/demandes?assignation=mes_demandes`) into its own screen,
// mirroring the Mon espace -> Mes missions relationship.
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/App';
import { demandesApi, type DemandesAggregates } from '@/lib/demandes.api';

import { useDemandesQuery } from './demandes/hooks/queries';
import { useDemandesMutations } from './demandes/hooks/mutations';
import { REQUEST_PAGE_SIZE } from './demandes/requests.constants';
import { NouvelleDemandeDialog } from './demandes/components/NewRequestDialog';
import { RequestsSummaryCards } from './demandes/components/RequestsSummaryCards';
import {
  RequestsRegistryTable,
  RequestsRegistryMobileCards,
} from './demandes/components/RequestsRegistryTable';
import { RequestWorkspace } from './demandes/components/RequestWorkspace';
import type { Demande } from './demandes/requests.types';

import { MyRequestsFilters } from './mes-demandes/components/MyRequestsFilters';
import { RequestsStatusChart } from './mes-demandes/components/RequestsStatusChart';
import { RequestsPriorityBreakdown } from './mes-demandes/components/RequestsPriorityBreakdown';
import { QuickActionsCard, HelpCard } from './mes-demandes/components/QuickActionsCard';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function MesDemandesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const statut = searchParams.get('statut') ?? '';
  const priorite = searchParams.get('priorite') ?? '';
  const direction = searchParams.get('direction') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [demandeOuverteId, setDemandeOuverteId] = useState<number | null>(null);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);

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

  const demandesQuery = useDemandesQuery({
    statut,
    priorite,
    direction,
    demandeurId: user?.id,
    search: debouncedSearch,
    page,
  });

  const aggregatesQuery = useQuery({
    queryKey: ['demandes-aggregates', { demandeurId: user?.id }],
    queryFn: async () => {
      const res = await demandesApi.aggregates({ demandeurId: user!.id });
      return res.data as DemandesAggregates;
    },
    enabled: !!user,
  });

  const {
    creerMutation,
    prendreEnChargeMutation,
    rappelerMutation,
    passerEnRelectureMutation,
    validerMutation,
    archiverMutation,
  } = useDemandesMutations({
    onDemandeCreee: () => {
      setModalNouvelle(false);
      setErreurCreation(null);
    },
    onCreationErreur: setErreurCreation,
  });

  if (!user) return null;

  const demandes = demandesQuery.data?.data ?? [];
  const totalPages = demandesQuery.data ? Math.ceil(demandesQuery.data.total / REQUEST_PAGE_SIZE) : 0;
  const hasFilters = Boolean(debouncedSearch || statut || priorite || direction);
  const demandeOuverte = demandeOuverteId ? demandes.find((d) => d.id === demandeOuverteId) ?? null : null;

  function resetFilters() {
    setSearch('');
    updateParams({ search: null, statut: null, priorite: null, direction: null, page: null });
  }

  async function handleRappeler(demande: Demande) {
    const ok = await confirm({
      title: 'Rappeler cette demande ?',
      description: 'Elle sera archivée et ne pourra plus être prise en charge.',
      confirmLabel: 'Rappeler',
      variant: 'destructive',
    });
    if (ok) rappelerMutation.mutate(demande.id);
  }

  const actionsProps = {
    onOpen: (demande: Demande) => setDemandeOuverteId(demande.id),
    onPrendreEnCharge: (id: number) => prendreEnChargeMutation.mutate(id),
    prendreEnChargeEnCours: prendreEnChargeMutation.isPending,
    onRappeler: handleRappeler,
    onPasserEnRelecture: (id: number) => passerEnRelectureMutation.mutate(id),
    passerEnRelectureEnCours: passerEnRelectureMutation.isPending,
    // Reviewer-only action — an agent's own requests never satisfy
    // canValidatePriority, so this never actually fires here.
    onOuvrirValidationPriorite: () => {},
    onValider: (id: number) => validerMutation.mutate(id),
    validerEnCours: validerMutation.isPending,
    onArchiver: (id: number) => archiverMutation.mutate(id),
    archiverEnCours: archiverMutation.isPending,
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Mes demandes</h2>
          <p className="mt-1 text-sm text-anac-muted">Suivez l&apos;état de vos demandes de traduction.</p>
        </div>
        <Button type="button" onClick={() => setModalNouvelle(true)} className="gap-2 bg-anac-blue">
          <Plus size={14} aria-hidden="true" />
          Nouvelle demande
        </Button>
      </header>

      <RequestsSummaryCards aggregates={aggregatesQuery.data} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <MyRequestsFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              updateParams({ page: null });
            }}
            statut={statut}
            onStatutChange={(value) => updateParams({ statut: value || null, page: null })}
            priorite={priorite}
            onPrioriteChange={(value) => updateParams({ priorite: value || null, page: null })}
            direction={direction}
            onDirectionChange={(value) => updateParams({ direction: value || null, page: null })}
            resultCount={demandesQuery.data?.total ?? 0}
            onReset={resetFilters}
          />

          {demandesQuery.isLoading ? (
            <div className="card flex min-h-64 items-center justify-center text-anac-muted">
              <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
              Chargement de vos demandes...
            </div>
          ) : demandesQuery.isError ? (
            <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <p className="font-semibold text-anac-navy">Impossible de charger vos demandes.</p>
              <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
              <Button type="button" variant="outline" onClick={() => demandesQuery.refetch()} className="gap-2">
                <RefreshCw size={14} aria-hidden="true" />
                Réessayer
              </Button>
            </div>
          ) : demandes.length === 0 ? (
            <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
              <p className="font-semibold text-anac-navy">
                {hasFilters ? 'Aucune demande ne correspond aux filtres sélectionnés.' : 'Vous n’avez aucune demande de traduction.'}
              </p>
              <p className="text-sm text-anac-muted">
                {hasFilters
                  ? 'Modifiez les filtres ou réinitialisez la recherche.'
                  : 'Vos nouvelles demandes apparaîtront ici.'}
              </p>
              {hasFilters && (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              <RequestsRegistryTable demandes={demandes} {...actionsProps} />
              <RequestsRegistryMobileCards demandes={demandes} {...actionsProps} />
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

          {/* Seules vos demandes sont affichées — pas la file globale de traduction. */}
          <p className="rounded-lg border border-anac-border bg-white px-4 py-3 text-xs text-anac-muted">
            Seules vos demandes sont affichées. Vous pouvez consulter l&apos;état, ouvrir la traduction associée et
            suivre l&apos;avancement.
          </p>
        </div>

        <div className="space-y-5">
          <RequestsStatusChart aggregates={aggregatesQuery.data} />
          <RequestsPriorityBreakdown aggregates={aggregatesQuery.data} />
          <QuickActionsCard onNouvelleDemande={() => setModalNouvelle(true)} />
          <HelpCard />
        </div>
      </div>

      <NouvelleDemandeDialog
        open={modalNouvelle}
        onOpenChange={(open) => {
          setModalNouvelle(open);
          if (!open) setErreurCreation(null);
        }}
        onSubmit={(data) => creerMutation.mutate(data)}
        chargement={creerMutation.isPending}
        erreur={erreurCreation}
      />

      <RequestWorkspace
        demande={demandeOuverte}
        onOpenChange={(open) => !open && setDemandeOuverteId(null)}
        {...actionsProps}
      />
    </div>
  );
}
