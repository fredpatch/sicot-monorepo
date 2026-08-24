// packages/client/src/pages/TraductionsPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { documentsApi } from '@/lib/documents.api';
import { traductionsApi, type TraductionDirection, type TraductionVue } from '@/lib/traductions.api';
import { TRADUCTION_PAGE_SIZE } from './traductions/traductions.constants';
import type { Traduction } from './traductions/traductions.types';
import { useTraductionsAggregatesQuery, useMoteurStatusQuery } from './traductions/hooks/queries';
import { useTraductionsMutations } from './traductions/hooks/mutations';
import { useLancerTraduction } from './traductions/hooks/useLaunchTraduction';
import { useTraductionPrefill } from './traductions/hooks/useTraductionPrefill';
import { TraductionsFiltres } from './traductions/components/TraductionsFilters';
import { NouvelleTraductionDialog } from './traductions/components/NewTraductionDialog';
import { TraductionsSummaryCards } from './traductions/components/TraductionsSummaryCards';
import { TranslationEngineStatus } from './traductions/components/TranslationEngineStatus';
import {
  TraductionsRegistryTable,
  TraductionsRegistryMobileCards,
} from './traductions/components/TraductionsRegistryTable';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function TraductionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const statut = searchParams.get('statut') ?? '';
  const direction = searchParams.get('direction') ?? '';
  const source = searchParams.get('source') ?? '';
  const vue: TraductionVue = searchParams.get('vue') === 'supprimees' ? 'supprimees' : 'actives';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  // ── Modal nouvelle traduction ─────────────────────────────────────────
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [texteLibre, setTexteLibre] = useState('');
  const [directionForm, setDirectionForm] = useState<TraductionDirection>('fr_en');
  const [documentIdForm, setDocumentIdForm] = useState<number | undefined>(undefined);

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
      statut: vue === 'actives' && statut ? (statut as Traduction['statut']) : undefined,
      direction: direction ? (direction as TraductionDirection) : undefined,
      source: source === 'libre' || source === 'document' ? (source as 'libre' | 'document') : undefined,
      vue,
      page,
      pageSize: TRADUCTION_PAGE_SIZE,
    }),
    [debouncedSearch, statut, direction, source, vue, page]
  );

  const traductionsQuery = useQuery({
    queryKey: ['traductions', queryParams],
    queryFn: async () => {
      const res = await traductionsApi.lister(queryParams);
      return res.data as { data: Traduction[]; total: number };
    },
  });

  const { data: aggregates } = useTraductionsAggregatesQuery();
  const { data: moteur } = useMoteurStatusQuery();

  const documentFormQuery = useQuery({
    queryKey: ['document', documentIdForm],
    queryFn: async () => {
      const res = await documentsApi.getById(documentIdForm!);
      return res.data as { nomOriginal: string };
    },
    enabled: documentIdForm !== undefined,
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const { supprimerMutation, restaurerMutation } = useTraductionsMutations();
  const { lancer, lancement, erreur, resetErreur } = useLancerTraduction({
    onSuccess: (traductionId) => {
      setModalNouvelle(false);
      setTexteLibre('');
      setDocumentIdForm(undefined);
      traductionsQuery.refetch();
      navigate(`/traductions/${traductionId}`);
    },
    onRefetchListe: () => traductionsQuery.refetch(),
  });

  useTraductionPrefill({
    onPrefill: ({ texte, documentId }) => {
      setTexteLibre(texte);
      setDocumentIdForm(documentId);
      setModalNouvelle(true);
    },
  });

  const traductions = traductionsQuery.data?.data ?? [];
  const totalPages = traductionsQuery.data
    ? Math.ceil(traductionsQuery.data.total / TRADUCTION_PAGE_SIZE)
    : 0;
  const hasFilters = Boolean(debouncedSearch || statut || direction || source);

  function resetFilters() {
    setSearch('');
    updateParams({ search: null, statut: null, direction: null, source: null, page: null });
  }

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value || null, page: null });
  }

  function changerVue(nouvelleVue: TraductionVue) {
    updateParams({ vue: nouvelleVue === 'actives' ? null : nouvelleVue, statut: null, page: null });
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Traductions</h2>
          <p className="mt-1 text-sm text-anac-muted">
            Traitez les traductions automatiques et manuelles.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <TranslationEngineStatus accessible={moteur?.accessible} />
          <Button
            type="button"
            onClick={() => setModalNouvelle(true)}
            className="gap-2 bg-anac-blue"
          >
            <Plus size={14} aria-hidden="true" />
            Nouvelle traduction
          </Button>
        </div>
      </header>

      <TraductionsSummaryCards aggregates={aggregates} />

      {moteur && !moteur.accessible && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-anac-warning">
          <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
          LibreTranslate est indisponible. Les nouvelles traductions pourront être réalisées
          manuellement.
        </div>
      )}

      <TraductionsFiltres
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        statut={statut}
        onStatutChange={(value) => setFilter('statut', value)}
        direction={direction}
        onDirectionChange={(value) => setFilter('direction', value)}
        source={source}
        onSourceChange={(value) => setFilter('source', value)}
        vue={vue}
        onVueChange={changerVue}
        supprimeesCount={aggregates?.supprimees}
        resultCount={traductionsQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {traductionsQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement des traductions...
        </div>
      ) : traductionsQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger les traductions.</p>
          <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => traductionsQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : traductions.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {vue === 'supprimees'
              ? 'Aucune traduction supprimée.'
              : hasFilters
                ? 'Aucune traduction ne correspond aux filtres sélectionnés.'
                : 'Aucune traduction enregistrée.'}
          </p>
          <p className="text-sm text-anac-muted">
            {vue === 'supprimees'
              ? 'Les traductions supprimées apparaîtront ici.'
              : hasFilters
                ? 'Modifiez les filtres ou réinitialisez la recherche.'
                : 'Lancez la première traduction.'}
          </p>
          {hasFilters && vue === 'actives' && (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <>
          <TraductionsRegistryTable
            traductions={traductions}
            vue={vue}
            onSupprimer={(id) => supprimerMutation.mutate(id)}
            supprimerEnCours={supprimerMutation.isPending}
            onRestaurer={(id) => restaurerMutation.mutate(id)}
            restaurerEnCours={restaurerMutation.isPending}
          />
          <TraductionsRegistryMobileCards
            traductions={traductions}
            vue={vue}
            onRestaurer={(id) => restaurerMutation.mutate(id)}
            restaurerEnCours={restaurerMutation.isPending}
          />
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

      {/* ── Modal : Nouvelle traduction ───────────────────────────────── */}
      <NouvelleTraductionDialog
        open={modalNouvelle}
        onOpenChange={(open) => {
          setModalNouvelle(open);
          if (!open) {
            setTexteLibre('');
            setDocumentIdForm(undefined);
            resetErreur();
          }
        }}
        direction={directionForm}
        onDirectionChange={setDirectionForm}
        texteLibre={texteLibre}
        onTexteLibreChange={setTexteLibre}
        onLancer={() => lancer(texteLibre, directionForm, documentIdForm)}
        chargement={lancement}
        erreur={erreur}
        moteurAccessible={moteur?.accessible}
        documentId={documentIdForm}
        documentNom={documentFormQuery.data?.nomOriginal}
      />
    </div>
  );
}
