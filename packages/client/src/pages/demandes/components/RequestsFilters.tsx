// packages/client/src/pages/demandes/components/DemandesFilters.tsx
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILTRES_STATUT, FILTRES_PRIORITE } from '../requests.constants';

interface DemandesFiltresProps {
  statut: string;
  onStatutChange: (value: string) => void;
  priorite: string;
  onPrioriteChange: (value: string) => void;
  onReset: () => void;
}

export function DemandesFiltres({
  statut,
  onStatutChange,
  priorite,
  onPrioriteChange,
  onReset,
}: DemandesFiltresProps) {
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
        value={priorite || '__all__'}
        onValueChange={(v) => onPrioriteChange(v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_PRIORITE.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(statut || priorite) && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
