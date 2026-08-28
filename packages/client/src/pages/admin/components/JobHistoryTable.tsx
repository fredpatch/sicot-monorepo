// packages/client/src/pages/admin/components/JobHistoryTable.tsx
import { useState } from 'react';
import { CheckCircle2, History, Loader2, XCircle } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { getModuleLabel } from '../admin.constants';
import { useJobHistoryQuery, JOB_HISTORY_PAGE_SIZE } from '../hooks/queries';
import type { JobDisponible } from '../admin.types';

interface JobHistoryTableProps {
  jobs?: JobDisponible[];
}

// Historique réel (manuel + cron), persistant en base - voir
// job-executions.service.ts côté serveur. Une ligne = une exécution, repliée
// sur une seule ligne par défaut (label/module/origine/horodatage) ; le
// résumé/l'erreur ne s'affiche qu'au clic pour garder la liste scannable.
export function JobHistoryTable({ jobs }: JobHistoryTableProps) {
  const [jobCle, setJobCle] = useState('');
  const [source, setSource] = useState('');
  const [succes, setSucces] = useState('');
  const [page, setPage] = useState(1);
  const [ouvert, setOuvert] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useJobHistoryQuery({ jobCle, source, succes, page });
  const totalPages = data ? Math.ceil(data.total / JOB_HISTORY_PAGE_SIZE) : 0;

  function resetPage() {
    setPage(1);
    setOuvert(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 px-1">
        <History size={12} className="text-anac-muted" />
        <p className="text-xs font-semibold uppercase tracking-wide text-anac-muted">
          Historique des exécutions
        </p>
        {isFetching && !isLoading && <Loader2 size={11} className="animate-spin text-anac-muted" />}
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Select
          value={jobCle || '__all__'}
          onValueChange={(v) => {
            setJobCle(v === '__all__' ? '' : v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tous les jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les jobs</SelectItem>
            {(jobs ?? []).map((j) => (
              <SelectItem key={j.cle} value={j.cle}>
                {j.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={source || '__all__'}
          onValueChange={(v) => {
            setSource(v === '__all__' ? '' : v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Toutes origines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes origines</SelectItem>
            <SelectItem value="manuel">Manuel</SelectItem>
            <SelectItem value="cron">Planifié (cron)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={succes || '__all__'}
          onValueChange={(v) => {
            setSucces(v === '__all__' ? '' : v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tous résultats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous résultats</SelectItem>
            <SelectItem value="true">Succès</SelectItem>
            <SelectItem value="false">Échec</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-anac-muted">
            <Loader2 size={16} className="mr-2 inline animate-spin" />
            Chargement...
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="py-10 text-center text-sm text-anac-muted">
            Aucune exécution enregistrée pour ces filtres.
          </div>
        ) : (
          <div className="divide-y divide-anac-border/60">
            {data.data.map((exec) => {
              const estOuvert = ouvert === exec.id;
              return (
                <div key={exec.id}>
                  <button
                    type="button"
                    onClick={() => setOuvert(estOuvert ? null : exec.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-anac-gray/60"
                    aria-expanded={estOuvert}
                  >
                    {exec.succes ? (
                      <CheckCircle2 size={13} className="shrink-0 text-green-600" />
                    ) : (
                      <XCircle size={13} className="shrink-0 text-anac-danger" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-anac-navy">
                      {jobs?.find((j) => j.cle === exec.jobCle)?.label ?? exec.jobCle}
                    </span>
                    <span className="badge-neutre shrink-0 text-[10px]">
                      {getModuleLabel(exec.module)}
                    </span>
                    <span className="shrink-0 text-[10px] text-anac-muted">
                      {exec.source === 'manuel' ? 'Manuel' : 'Cron'}
                    </span>
                    <span className="shrink-0 text-[10px] text-anac-muted/70">
                      {new Date(exec.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>

                  {estOuvert && (
                    <div className="border-t border-anac-border/60 bg-anac-gray/30 px-3.5 py-2.5 text-xs text-anac-muted">
                      {exec.resume}
                      {exec.erreur && ` - ${exec.erreur}`}
                      <span className="ml-1.5">({exec.dureeMs}ms)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DataTablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel="Page"
        ofLabel="sur"
      />
    </div>
  );
}
