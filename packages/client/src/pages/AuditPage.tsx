import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { auditApi } from '@/lib/audit.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface AuditLog {
  id: number;
  userId?: number;
  userMatricule?: string;
  userNom?: string;
  userPrenom?: string;
  action: string;
  module: string;
  entiteId?: number;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

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
  const { data: modulesDisponibles } = useQuery({
    queryKey: ['audit-modules'],
    queryFn: async () => {
      const res = await auditApi.getModules();
      return res.data as string[];
    },
  });

  const { data: actionsDisponibles } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: async () => {
      const res = await auditApi.getActions();
      return res.data as string[];
    },
  });

  // ── Requête liste ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['audit', module, action, dateDebut, dateFin, page],
    queryFn: async () => {
      const res = await auditApi.lister({
        module: module || undefined,
        action: action || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res.data as { data: AuditLog[]; total: number };
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const filtresActifs = module !== '' || action !== '' || dateDebut !== '' || dateFin !== '';

  function reinitialiser() {
    setModule('');
    setAction('');
    setDateDebut('');
    setDateFin('');
    setPage(1);
  }

  function formatDateHeure(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <Select
          value={module || '__all__'}
          onValueChange={(v) => {
            setModule(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous les modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les modules</SelectItem>
            {modulesDisponibles?.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={action || '__all__'}
          onValueChange={(v) => {
            setAction(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les actions</SelectItem>
            {actionsDisponibles?.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-anac-muted">Du</label>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => {
              setDateDebut(e.target.value);
              setPage(1);
            }}
            className="input h-9 text-sm w-36"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-anac-muted">Au</label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => {
              setDateFin(e.target.value);
              setPage(1);
            }}
            className="input h-9 text-sm w-36"
          />
        </div>

        {filtresActifs && (
          <Button variant="secondary" size="sm" onClick={reinitialiser}>
            Réinitialiser
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              window.open(
                auditApi.getUrlExportPDF({ module, action, dateDebut, dateFin }),
                '_blank'
              )
            }
          >
            <FileText size={13} /> Export PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              window.open(
                auditApi.getUrlExportExcel({ module, action, dateDebut, dateFin }),
                '_blank'
              )
            }
          >
            <FileSpreadsheet size={13} /> Export Excel
          </Button>
        </div>
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-4 py-3">Date / heure</th>
              <th className="text-left px-4 py-3">Utilisateur</th>
              <th className="text-left px-4 py-3">Module</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">Entité</th>
              <th className="text-left px-4 py-3">IP</th>
              <th className="text-left px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-anac-muted">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  {t('common.loading')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-anac-muted">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              data?.data.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="px-4 py-3 text-anac-text whitespace-nowrap">
                    {formatDateHeure(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {log.userMatricule ? (
                      <div>
                        <div className="font-medium text-anac-navy">
                          {log.userPrenom} {log.userNom}
                        </div>
                        <div className="text-anac-muted text-xs font-mono">{log.userMatricule}</div>
                      </div>
                    ) : (
                      <span className="text-anac-muted">Système</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-info">{log.module}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-anac-text">{log.action}</td>
                  <td className="px-4 py-3 text-anac-muted flex items-center justify-center font-mono text-xs">
                    {log.entiteId ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-anac-muted font-mono text-xs">{log.ip ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setLogSelectionne(log)}
                      className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy gap-1"
                    >
                      <Eye size={12} /> Détails
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-anac-muted">
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft size={13} /> Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1.5"
            >
              Suivant <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog : Détails de l'entrée ─────────────────────────────── */}
      <Dialog
        open={!!logSelectionne}
        onOpenChange={(open) => {
          if (!open) setLogSelectionne(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{logSelectionne?.action}</DialogTitle>
            <DialogDescription>
              {logSelectionne && formatDateHeure(logSelectionne.createdAt)} - Module{' '}
              {logSelectionne?.module}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-anac-muted">Utilisateur</span>
                <span className="text-anac-navy font-medium">
                  {logSelectionne?.userMatricule
                    ? `${logSelectionne.userPrenom} ${logSelectionne.userNom} (${logSelectionne.userMatricule})`
                    : 'Système'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-anac-muted">Entité concernée</span>
                <span className="text-anac-navy font-medium">
                  {logSelectionne?.entiteId ?? '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-anac-muted">Adresse IP</span>
                <span className="text-anac-navy font-mono text-xs">
                  {logSelectionne?.ip ?? '-'}
                </span>
              </div>
              {logSelectionne?.details && (
                <div>
                  <p className="text-anac-muted mb-1.5">Détails</p>
                  <pre className="bg-anac-gray/50 rounded-lg p-3 text-xs overflow-x-auto text-anac-text">
                    {JSON.stringify(logSelectionne.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
