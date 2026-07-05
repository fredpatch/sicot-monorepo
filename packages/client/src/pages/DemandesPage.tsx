// packages/client/src/pages/DemandesPage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';

import { useDemandesColumns } from './demandes/requests.columns';
import { useDemandesQuery, PAGE_SIZE } from './demandes/hooks/queries';
import { useDemandesMutations } from './demandes/hooks/mutations';
import { DemandesFiltres } from './demandes/components/RequestsFilters';
import { NouvelleDemandeDialog } from './demandes/components/NewRequestDialog';
import { ValiderPrioriteDialog } from './demandes/components/ValidatePriorityDialog';
import type { Demande } from './demandes/requests.types';
import { Button } from '@/components/ui/button';

export default function DemandesPage() {
  const { t } = useTranslation();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [page, setPage] = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [modalPriorite, setModalPriorite] = useState<Demande | null>(null);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading } = useDemandesQuery({ statut, priorite, page });

  // ── Mutations ─────────────────────────────────────────────────────────
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

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useDemandesColumns({
    t,
    onPrendreEnCharge: (id) => prendreEnChargeMutation.mutate(id),
    prendreEnChargeEnCours: prendreEnChargeMutation.isPending,
    onRappeler: (id) => rappelerMutation.mutate(id),
    onPasserEnRelecture: (id) => passerEnRelectureMutation.mutate(id),
    passerEnRelectureEnCours: passerEnRelectureMutation.isPending,
    onOuvrirValidationPriorite: setModalPriorite,
    onValider: (id) => validerMutation.mutate(id),
    validerEnCours: validerMutation.isPending,
    onArchiver: (id) => archiverMutation.mutate(id),
    archiverEnCours: archiverMutation.isPending,
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Demandes de traduction</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} demande{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setModalNouvelle(true)} className="gap-2">
          <Plus size={13} /> Nouvelle demande
        </Button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <DemandesFiltres
        statut={statut}
        onStatutChange={(v) => {
          setStatut(v);
          setPage(1);
        }}
        priorite={priorite}
        onPrioriteChange={(v) => {
          setPriorite(v);
          setPage(1);
        }}
        onReset={() => {
          setStatut('');
          setPriorite('');
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
      />

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <DataTablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel={t('common.page')}
        ofLabel={t('common.of')}
      />

      {/* ── Modal : Nouvelle demande ──────────────────────────────────── */}
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

      {/* ── Modal : Valider priorité ──────────────────────────────────── */}
      <ValiderPrioriteDialog
        demande={modalPriorite}
        onOpenChange={(open) => !open && setModalPriorite(null)}
        onConfirmer={(priorite) =>
          modalPriorite && validerPrioriteMutation.mutate({ id: modalPriorite.id, priorite })
        }
        chargement={validerPrioriteMutation.isPending}
      />
    </div>
  );
}
