// packages/client/src/pages/analytics/components/PeriodeSelector.tsx
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { analyticsApi } from '@/lib/analytics.api';
import { PRESETS } from '../analytics.constants';
import type { Onglet, Periode, PeriodePreset } from '../analytics.types';

interface PeriodeSelectorProps {
  preset: PeriodePreset;
  onPresetChange: (preset: PeriodePreset) => void;
  customDebut: string;
  onCustomDebutChange: (value: string) => void;
  customFin: string;
  onCustomFinChange: (value: string) => void;
  ongletActif: Onglet;
  periode: Periode;
}

export function PeriodeSelector({
  preset,
  onPresetChange,
  customDebut,
  onCustomDebutChange,
  customFin,
  onCustomFinChange,
  ongletActif,
  periode,
}: PeriodeSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as PeriodePreset)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.cle} value={p.cle}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'personnalise' && (
        <>
          <input
            type="date"
            value={customDebut}
            onChange={(e) => onCustomDebutChange(e.target.value)}
            className="input h-9 text-sm w-36"
          />
          <span className="text-anac-muted text-sm">au</span>
          <input
            type="date"
            value={customFin}
            onChange={(e) => onCustomFinChange(e.target.value)}
            className="input h-9 text-sm w-36"
          />
        </>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          window.open(analyticsApi.getUrlExport(ongletActif, 'excel', periode), '_blank')
        }
      >
        <FileSpreadsheet size={13} /> Excel
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          window.open(analyticsApi.getUrlExport(ongletActif, 'csv', periode), '_blank')
        }
      >
        <FileText size={13} /> CSV
      </Button>
    </div>
  );
}
