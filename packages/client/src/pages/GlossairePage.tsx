// packages/client/src/pages/GlossairePage.tsx
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { glossaireApi } from '@/lib/glossaire.api';
import { GLOSSAIRE_PAGE_SIZE } from './glossaire/glossary.constants';
import type { Terme } from './glossaire/glossary.types';
import { getErrorMessage } from './glossaire/glossary.utils';
import { canManageGlossaire } from './glossaire/glossary.permissions';
import { useGlossaireAggregatesQuery, useTermeDetailQuery } from './glossaire/hooks/queries';
import { useGlossaireMutations } from './glossaire/hooks/mutations';
import { GlossaireFiltres } from './glossaire/components/GlossaryFilters';
import { GlossarySummaryCards } from './glossaire/components/GlossarySummaryCards';
import {
  GlossaryRegistryTable,
  GlossaryRegistryMobileCards,
} from './glossaire/components/GlossaryRegistryTable';
import { TermWorkspace } from './glossaire/components/TermWorkspace';
import { TermDialog } from './glossaire/components/form/TermDialog';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function GlossairePage() {
  const { user } = useAuth();
  const canManage = canManageGlossaire(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const statut = searchParams.get('statut') ?? '';
  const domaine = searchParams.get('domaine') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [modalTerme, setModalTerme] = useState<'creer' | 'modifier' | null>(null);
  const [termeSelectionne, setTermeSelectionne] = useState<Terme | null>(null);
  const [termeWorkspace, setTermeWorkspace] = useState<Terme | null>(null);

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

  const glossaireQuery = useQuery({
    queryKey: ['glossaire', debouncedSearch, statut, domaine, page],
    queryFn: async () => {
      const res = await glossaireApi.lister({
        search: debouncedSearch || undefined,
        domaine: domaine || undefined,
        actif: statut === 'actif' ? true : statut === 'inactif' ? false : undefined,
        page,
        pageSize: GLOSSAIRE_PAGE_SIZE,
      });
      return res.data as { data: Terme[]; total: number; domaines: string[] };
    },
  });

  const { data: aggregates } = useGlossaireAggregatesQuery();
  const { data: termeDetail, isLoading: detailLoading } = useTermeDetailQuery(termeWorkspace?.id);

  const { creerMutation, modifierMutation, desactiverMutation, reactiverMutation } =
    useGlossaireMutations({
      termeSelectionneId: termeSelectionne?.id,
      onTermeCree: () => setModalTerme(null),
      onTermeModifie: () => {
        setModalTerme(null);
        setTermeSelectionne(null);
      },
    });

  const termes = glossaireQuery.data?.data ?? [];
  const domaines = glossaireQuery.data?.domaines ?? [];
  const totalPages = glossaireQuery.data ? Math.ceil(glossaireQuery.data.total / GLOSSAIRE_PAGE_SIZE) : 0;
  const hasFilters = Boolean(debouncedSearch || statut || domaine);

  function resetFilters() {
    setSearch('');
    updateParams({ search: null, statut: null, domaine: null, page: null });
  }

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value || null, page: null });
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-anac-navy">Glossaire</h2>
          <p className="mt-1 text-sm text-anac-muted">
            Gérez les termes et leur terminologie officielle utilisés dans les traductions.
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            onClick={() => {
              setTermeSelectionne(null);
              setModalTerme('creer');
            }}
            className="gap-2 bg-anac-blue"
          >
            <Plus size={14} aria-hidden="true" />
            Nouveau terme
          </Button>
        )}
      </header>

      <GlossarySummaryCards aggregates={aggregates} />

      <GlossaireFiltres
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          updateParams({ page: null });
        }}
        statut={statut}
        onStatutChange={(value) => setFilter('statut', value)}
        domaine={domaine}
        onDomaineChange={(value) => setFilter('domaine', value)}
        domaines={domaines}
        resultCount={glossaireQuery.data?.total ?? 0}
        onReset={resetFilters}
      />

      {glossaireQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement du glossaire...
        </div>
      ) : glossaireQuery.isError ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <AlertCircle size={20} className="text-anac-danger" aria-hidden="true" />
          <p className="font-semibold text-anac-navy">Impossible de charger le glossaire.</p>
          <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => glossaireQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : termes.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            {hasFilters ? 'Aucun terme ne correspond à votre recherche.' : 'Aucun terme enregistré.'}
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Modifiez les filtres ou réinitialisez la recherche.'
              : canManage
                ? 'Créez le premier terme du glossaire.'
                : 'Aucun terme n\'a encore été ajouté.'}
          </p>
          {hasFilters && (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <>
          <GlossaryRegistryTable
            termes={termes}
            canManage={canManage}
            onVoir={setTermeWorkspace}
            onModifier={(terme) => {
              setTermeSelectionne(terme);
              setModalTerme('modifier');
            }}
            onDesactiver={(id) => desactiverMutation.mutate(id)}
            desactiverEnCours={desactiverMutation.isPending}
            onReactiver={(id) => reactiverMutation.mutate(id)}
            reactiverEnCours={reactiverMutation.isPending}
          />
          <GlossaryRegistryMobileCards
            termes={termes}
            canManage={canManage}
            onVoir={setTermeWorkspace}
            onReactiver={(id) => reactiverMutation.mutate(id)}
            reactiverEnCours={reactiverMutation.isPending}
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

      {/* ── Modal : Créer / Modifier terme ───────────────────────────── */}
      <TermDialog
        mode={modalTerme}
        terme={termeSelectionne}
        onOpenChange={(open) => {
          if (!open) {
            setModalTerme(null);
            setTermeSelectionne(null);
            creerMutation.reset();
            modifierMutation.reset();
          }
        }}
        onSubmit={(data) => {
          if (modalTerme === 'creer') {
            creerMutation.mutate(data);
          } else {
            modifierMutation.mutate(data);
          }
        }}
        chargement={creerMutation.isPending || modifierMutation.isPending}
        erreur={
          getErrorMessage(creerMutation.error) ?? getErrorMessage(modifierMutation.error)
        }
      />

      {/* ── Fiche terminologique : Voir / Historique ─────────────────── */}
      <TermWorkspace
        terme={termeWorkspace}
        termeDetail={termeDetail}
        detailLoading={detailLoading}
        canManage={canManage}
        onOpenChange={(open) => !open && setTermeWorkspace(null)}
        onModifier={(terme) => {
          setTermeWorkspace(null);
          setTermeSelectionne(terme);
          setModalTerme('modifier');
        }}
        onDesactiver={(id) => desactiverMutation.mutate(id)}
        desactiverEnCours={desactiverMutation.isPending}
        onReactiver={(id) => reactiverMutation.mutate(id)}
        reactiverEnCours={reactiverMutation.isPending}
      />
    </div>
  );
}
