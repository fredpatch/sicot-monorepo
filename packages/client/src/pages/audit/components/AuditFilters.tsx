// packages/client/src/pages/audit/components/AuditFiltres.tsx
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { auditApi } from '@/lib/audit.api';

interface AuditFiltresProps {
  module: string;
  onModuleChange: (value: string) => void;
  modulesDisponibles?: string[];
  action: string;
  onActionChange: (value: string) => void;
  actionsDisponibles?: string[];
  dateDebut: string;
  onDateDebutChange: (value: string) => void;
  dateFin: string;
  onDateFinChange: (value: string) => void;
  onReset: () => void;
}

export function AuditFiltres({
  module,
  onModuleChange,
  modulesDisponibles,
  action,
  onActionChange,
  actionsDisponibles,
  dateDebut,
  onDateDebutChange,
  dateFin,
  onDateFinChange,
  onReset,
}: AuditFiltresProps) {
  const aUnFiltreActif = module !== '' || action !== '' || dateDebut !== '' || dateFin !== '';

  return (
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <Select
        value={module || '__all__'}
        onValueChange={(v) => onModuleChange(v === '__all__' ? '' : v)}
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
        onValueChange={(v) => onActionChange(v === '__all__' ? '' : v)}
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
          onChange={(e) => onDateDebutChange(e.target.value)}
          className="input h-9 text-sm w-36"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-anac-muted">Au</label>
        <input
          type="date"
          value={dateFin}
          onChange={(e) => onDateFinChange(e.target.value)}
          className="input h-9 text-sm w-36"
        />
      </div>

      {aUnFiltreActif && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            window.open(auditApi.getUrlExportPDF({ module, action, dateDebut, dateFin }), '_blank')
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
  );
}
