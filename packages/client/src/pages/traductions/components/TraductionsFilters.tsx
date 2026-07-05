// packages/client/src/pages/traductions/components/TraductionsFilters.tsx
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILTRES_STATUT, FILTRES_DIRECTION } from '../traductions.constants';

interface TraductionsFiltresProps {
  statut: string;
  onStatutChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  onReset: () => void;
}

export function TraductionsFiltres({
  statut,
  onStatutChange,
  direction,
  onDirectionChange,
  onReset,
}: TraductionsFiltresProps) {
  return (
    <div className="card p-4 flex flex-wrap gap-3">
      <Select
        value={statut || '__all__'}
        onValueChange={(v) => onStatutChange(v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_STATUT.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={direction || '__all__'}
        onValueChange={(v) => onDirectionChange(v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_DIRECTION.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(statut || direction) && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
