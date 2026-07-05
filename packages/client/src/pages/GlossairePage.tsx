// packages/client/src/pages/GlossairePage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';

import { useGlossaireColumns } from './glossaire/glossary.columns';
import { useGlossaireQuery, useTermeDetailQuery, PAGE_SIZE } from './glossaire/hooks/queries';
import { useGlossaireMutations } from './glossaire/hooks/mutations';
import { GlossaireFiltres } from './glossaire/components/GlossaryFilters';
import { TermeDialog } from './glossaire/components/TermsDialog';
import { HistoriqueDialog } from './glossaire/components/HistoryDialog';
import type { Terme } from './glossaire/glossary.types';
import { Button } from '@/components/ui/button';

export default function GlossairePage() {
  const { t } = useTranslation();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [domaine, setDomaine] = useState('');
  const [afficherInactifs, setAfficherInactifs] = useState(false);
  const [page, setPage] = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────
  const [modalTerme, setModalTerme] = useState<'creer' | 'modifier' | null>(null);
  const [termeSelectionne, setTermeSelectionne] = useState<Terme | null>(null);
  const [modalHistorique, setModalHistorique] = useState<Terme | null>(null);

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading } = useGlossaireQuery({ search, domaine, afficherInactifs, page });
  const { data: termeDetail } = useTermeDetailQuery(modalHistorique?.id);

  // ── Mutations ─────────────────────────────────────────────────────────
  const { creerMutation, modifierMutation, desactiverMutation } = useGlossaireMutations({
    termeSelectionneId: termeSelectionne?.id,
    onTermeCree: () => setModalTerme(null),
    onTermeModifie: () => {
      setModalTerme(null);
      setTermeSelectionne(null);
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const domaines = data?.domaines ?? [];

  const colonnes = useGlossaireColumns({
    t,
    onModifier: (terme) => {
      setTermeSelectionne(terme);
      setModalTerme('modifier');
    },
    onHistorique: setModalHistorique,
    onDesactiver: (id) => desactiverMutation.mutate(id),
    desactiverEnCours: desactiverMutation.isPending,
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Glossaire & Mémoire de traduction</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} terme{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            setTermeSelectionne(null);
            setModalTerme('creer');
          }}
          className="gap-2"
        >
          <Plus size={13} /> Nouveau terme
        </Button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <GlossaireFiltres
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        domaine={domaine}
        onDomaineChange={(v) => {
          setDomaine(v);
          setPage(1);
        }}
        domaines={domaines}
        afficherInactifs={afficherInactifs}
        onAfficherInactifsChange={(v) => {
          setAfficherInactifs(v);
          setPage(1);
        }}
        onReset={() => {
          setSearch('');
          setDomaine('');
          setAfficherInactifs(false);
          setPage(1);
        }}
      />

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <DataTable
        columns={colonnes}
        data={data?.data ?? []}
        isLoading={isLoading}
        loadingMessage={t('common.loading')}
        emptyMessage={t('common.noData')}
        rowClassName={(terme) => (!terme.actif ? 'opacity-50' : undefined)}
      />

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <DataTablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel={t('common.page')}
        ofLabel={t('common.of')}
      />

      {/* ── Modal : Créer / Modifier terme ───────────────────────────── */}
      <TermeDialog
        mode={modalTerme}
        terme={termeSelectionne}
        onOpenChange={(open) => {
          if (!open) {
            setModalTerme(null);
            setTermeSelectionne(null);
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
      />

      {/* ── Modal : Historique ────────────────────────────────────────── */}
      <HistoriqueDialog
        terme={modalHistorique}
        termeDetail={termeDetail}
        onOpenChange={(open) => !open && setModalHistorique(null)}
      />
    </div>
  );
}
