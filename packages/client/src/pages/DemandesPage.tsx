// packages/client/src/pages/DemandesPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/App';

import { useDemandesQuery, useDemandesAggregatesQuery } from './demandes/hooks/queries';
import { useDemandesMutations } from './demandes/hooks/mutations';
import { REQUEST_PAGE_SIZE } from './demandes/requests.constants';
import { DemandesFiltres } from './demandes/components/RequestsFilters';
import { NouvelleDemandeDialog } from './demandes/components/NewRequestDialog';
import { ValiderPrioriteDialog } from './demandes/components/ValidatePriorityDialog';
import { RequestsSummaryCards } from './demandes/components/RequestsSummaryCards';
import {
  RequestsRegistryTable,
  RequestsRegistryMobileCards,
} from './demandes/components/RequestsRegistryTable';
import { RequestWorkspace } from './demandes/components/RequestWorkspace';
import type { Demande } from './demandes/requests.types';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function DemandesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const statut = searchParams.get('statut') ?? '';
  const priorite = searchParams.get('priorite') ?? '';
  const assignation = searchParams.get('assignation') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  // ── Modals / workspace ───────────────────────────────────────────────────
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [modalPriorite, setModalPriorite] = useState<Demande | null>(null);
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

  // "Non assignées" ≡ statut soumise (traducteurId is only ever set once statut
  // leaves soumise) - no dedicated backend concept needed, per the brief's
  // instruction not to invent new backend concepts unnecessarily.
  const { demandeurId, traducteurId, statutEffectif } = useMemo(() => {
    if (assignation === 'mes_demandes')
      return { demandeurId: user?.id, traducteurId: undefined, statutEffectif: statut };
    if (assignation === 'mes_traductions')
      return { demandeurId: undefined, traducteurId: user?.id, statutEffectif: statut };
    if (assignation === 'non_assignees')
      return { demandeurId: undefined, traducteurId: undefined, statutEffectif: 'soumise' };
    return { demandeurId: undefined, traducteurId: undefined, statutEffectif: statut };
  }, [assignation, statut, user?.id]);

  const demandesQuery = useDemandesQuery({
    statut: statutEffectif,
    priorite,
    demandeurId,
    traducteurId,
    search: debouncedSearch,
    page,
  });
  const { data: aggregates } = useDemandesAggregatesQuery();

  const {
    creerMutation,
    prendreEnChargeMutation,
    rappelerMutation,
    passerEnRelectureMutation,
    validerMutation,
    archiverMutation,
    validerPrioriteMutation,
  } = useDemandesMutations({
    onDemandeCreee: () => {
      setModalNouvelle(false);
      setErreurCreation(null);
    },
    onCreationErreur: setErreurCreation,
    onPrioriteValidee: () => setModalPriorite(null),
  });

  const demandes = demandesQuery.data?.data ?? [];
  const totalPages = demandesQuery.data
    ? Math.ceil(demandesQuery.data.total / REQUEST_PAGE_SIZE)
    : 0;
  const hasFilters = Boolean(debouncedSearch || statut || priorite || assignation);

  // Derived from the current page's data rather than kept as its own copy of
  // the row, so the open workspace always reflects the freshest data after a
  // mutation invalidates and refetches the list.
  const demandeOuverte = demandeOuverteId
    ? (demandes.find((d) => d.id === demandeOuverteId) ?? null)
    : null;

  function resetFilters() {
    setSearch('');
    updateParams({ search: null, statut: null, priorite: null, assignation: null, page: null });
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
    onOuvrirValidationPriorite: setModalPriorite,
    onValider: (id: number) => validerMutation.mutate(id),
    validerEnCours: validerMutation.isPending,
    onArchiver: (id: number) => archiverMutation.mutate(id),
    archiverEnCours: archiverMutation.isPending,
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">
            Demandes de traduction
          </h2>
          <p className="mt-1 text-sm text-anac-muted">
            Suivez les demandes, assignez-les et pilotez leur avancement.
          </p>
        </div>
        <Button type="button" onClick={() => setModalNouvelle(true)} className="gap-2 bg-anac-blue">
          <Plus size={14} aria-hidden="true" />
          Nouvelle demande
        </Button>
      </header>

      <RequestsSummaryCards aggregates={aggregates} />

      <DemandesFiltres
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        statut={statut}
        onStatutChange={(value) => updateParams({ statut: value || null, page: null })}
        priorite={priorite}
        onPrioriteChange={(value) => updateParams({ priorite: value || null, page: null })}
        assignation={assignation}
        onAssignationChange={(value) => updateParams({ assignation: value || null, page: null })}
        resultCount={demandesQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {demandesQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement des demandes...
        </div>
      ) : demandesQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger les demandes.</p>
          <p className="text-sm text-anac-muted">
            Vérifiez la connexion au serveur puis réessayez.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => demandesQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : demandes.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {hasFilters
              ? 'Aucune demande ne correspond aux filtres sélectionnés.'
              : 'Aucune demande de traduction.'}
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Modifiez les filtres ou réinitialisez la recherche.'
              : 'Les nouvelles demandes apparaîtront ici.'}
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

      {/* ── Modal : Nouvelle demande ──────────────────────────────────────── */}
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

      {/* ── Modal : Valider priorité ──────────────────────────────────────── */}
      <ValiderPrioriteDialog
        demande={modalPriorite}
        onOpenChange={(open) => !open && setModalPriorite(null)}
        onConfirmer={(priorite) =>
          modalPriorite && validerPrioriteMutation.mutate({ id: modalPriorite.id, priorite })
        }
        chargement={validerPrioriteMutation.isPending}
      />

      {/* ── Workspace : demande sélectionnée ────────────────────────────────── */}
      <RequestWorkspace
        demande={demandeOuverte}
        onOpenChange={(open) => !open && setDemandeOuverteId(null)}
        {...actionsProps}
      />
    </div>
  );
}
