// packages/client/src/pages/TraductionsPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import type { TraductionDirection } from '@/lib/traductions.api';

import { useTraductionsColumns } from './traductions/traductions.columns';
import { useTraductionsQuery, useMoteurStatusQuery, PAGE_SIZE } from './traductions/hooks/queries';
import { useTraductionsMutations } from './traductions/hooks/mutations';
import { useLancerTraduction } from './traductions/hooks/useLaunchTraduction';
import { useTraductionPrefill } from './traductions/hooks/useTraductionPrefill';
import { TraductionsFiltres } from './traductions/components/TraductionsFilters';
import { NouvelleTraductionDialog } from './traductions/components/NewTraductionDialog';

export default function TraductionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [statut, setStatut] = useState('');
  const [direction, setDirection] = useState('');
  const [page, setPage] = useState(1);

  // ── Modal nouvelle traduction ─────────────────────────────────────────
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [texteLibre, setTexteLibre] = useState('');
  const [directionForm, setDirectionForm] = useState<TraductionDirection>('fr_en');

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useTraductionsQuery({ statut, direction, page });
  const { data: moteur } = useMoteurStatusQuery();

  // ── Mutations ─────────────────────────────────────────────────────────
  const { supprimerMutation } = useTraductionsMutations();
  const { lancer, lancement, erreur, resetErreur } = useLancerTraduction({
    onSuccess: (traductionId) => {
      setModalNouvelle(false);
      setTexteLibre('');
      refetch();
      navigate(`/traductions/${traductionId}`);
    },
    onRefetchListe: refetch,
  });

  useTraductionPrefill({
    onPrefill: (texte) => {
      setTexteLibre(texte);
      setModalNouvelle(true);
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useTraductionsColumns({
    t,
    onSupprimer: (id) => supprimerMutation.mutate(id),
    supprimerEnCours: supprimerMutation.isPending,
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Traduction IA</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} traduction{(data?.total ?? 0) > 1 ? 's' : ''}
            {moteur && (
              <span
                className={`ml-3 text-xs font-medium ${moteur.accessible ? 'text-green-600' : 'text-red-500'}`}
              >
                · LibreTranslate {moteur.accessible ? '✓ Opérationnel' : '✕ Hors ligne'}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setModalNouvelle(true)} className="gap-2">
          <Plus size={13} /> Nouvelle traduction
        </Button>
      </div>

      {/* ── Alerte moteur hors ligne ──────────────────────────────────── */}
      {moteur && !moteur.accessible && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          LibreTranslate est inaccessible. Les nouvelles traductions seront marquées &quot;Manuelle
          requise&quot;.
        </div>
      )}

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <TraductionsFiltres
        statut={statut}
        onStatutChange={(v) => {
          setStatut(v);
          setPage(1);
        }}
        direction={direction}
        onDirectionChange={(v) => {
          setDirection(v);
          setPage(1);
        }}
        onReset={() => {
          setStatut('');
          setDirection('');
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

      {/* ── Modal : Nouvelle traduction ───────────────────────────────── */}
      <NouvelleTraductionDialog
        open={modalNouvelle}
        onOpenChange={(open) => {
          setModalNouvelle(open);
          if (!open) {
            setTexteLibre('');
            resetErreur();
          }
        }}
        direction={directionForm}
        onDirectionChange={setDirectionForm}
        texteLibre={texteLibre}
        onTexteLibreChange={setTexteLibre}
        onLancer={() => lancer(texteLibre, directionForm)}
        chargement={lancement}
        erreur={erreur}
        moteurAccessible={moteur?.accessible}
      />
    </div>
  );
}
