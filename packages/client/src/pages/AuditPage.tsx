import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';

import { AuditFiltres } from './audit/components/AuditFilters';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { DataTable } from '@/components/table/data-table';
import { AuditDetailsDialog } from './audit/components/AuditDetailsDialog';
import { useAuditColumns } from './audit/audit.columns';
import { AuditLog } from './audit/audit.types';
import {
  useAuditActionsQuery,
  useAuditLogsQuery,
  useAuditModulesQuery,
} from './audit/hooks/queries';

const PAGE_SIZE = 10;

// ── Composant principal ────────────────────────────────────────────────────
export default function AuditPage() {
  const { t } = useTranslation();

  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [page, setPage] = useState(1);
  const [logSelectionne, setLogSelectionne] = useState<AuditLog | null>(null);

  // ── Métadonnées pour les filtres ────────────────────────────────────────
  const { data: modulesDisponibles } = useAuditModulesQuery();
  const { data: actionsDisponibles } = useAuditActionsQuery();
  const { data, isLoading } = useAuditLogsQuery({ module, action, dateDebut, dateFin, page });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useAuditColumns({ t, onViewDetails: setLogSelectionne });

  function reinitialiser() {
    setModule('');
    setAction('');
    setDateDebut('');
    setDateFin('');
    setPage(1);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center">
          <ClipboardList size={18} className="text-anac-navy" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Journal d&apos;audit</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} entrée{(data?.total ?? 0) > 1 ? 's' : ''} - lecture seule, non
            modifiable
          </p>
        </div>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <AuditFiltres
        module={module}
        onModuleChange={(v) => {
          setModule(v);
          setPage(1);
        }}
        modulesDisponibles={modulesDisponibles}
        action={action}
        onActionChange={(v) => {
          setAction(v);
          setPage(1);
        }}
        actionsDisponibles={actionsDisponibles}
        dateDebut={dateDebut}
        onDateDebutChange={(v) => {
          setDateDebut(v);
          setPage(1);
        }}
        dateFin={dateFin}
        onDateFinChange={(v) => {
          setDateFin(v);
          setPage(1);
        }}
        onReset={reinitialiser}
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

      {/* ── Dialog : Détails de l'entrée ─────────────────────────────── */}
      <AuditDetailsDialog
        log={logSelectionne}
        onOpenChange={(open) => !open && setLogSelectionne(null)}
      />
    </div>
  );
}
