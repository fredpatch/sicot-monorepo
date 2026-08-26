// packages/client/src/pages/mes-demandes/components/MyRequestsFilters.tsx
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FILTRES_STATUT, FILTRES_PRIORITE, FILTRES_DIRECTION } from '../../demandes/requests.constants';

const STATUT_LABELS = Object.fromEntries(FILTRES_STATUT.map((f) => [f.value, f.label]));
const PRIORITE_LABELS = Object.fromEntries(FILTRES_PRIORITE.map((f) => [f.value, f.label]));
const DIRECTION_LABELS = Object.fromEntries(FILTRES_DIRECTION.map((f) => [f.value, f.label]));

interface MyRequestsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statut: string;
  onStatutChange: (value: string) => void;
  priorite: string;
  onPrioriteChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  resultCount: number;
  onReset: () => void;
}

export function MyRequestsFilters({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  priorite,
  onPrioriteChange,
  direction,
  onDirectionChange,
  resultCount,
  onReset,
}: MyRequestsFiltersProps) {
  const hasFilters = Boolean(search || statut || priorite || direction);

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un titre, un document…"
            className="h-9 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[420px]">
          <Select
            value={statut || '__all__'}
            onValueChange={(value) => onStatutChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Statut" />
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
            onValueChange={(value) => onPrioriteChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              {FILTRES_PRIORITE.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={direction || '__all__'}
            onValueChange={(value) => onDirectionChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              {FILTRES_DIRECTION.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
          <span className="font-medium text-anac-navy">
            {resultCount} résultat{resultCount > 1 ? 's' : ''}
          </span>
          {statut && (
            <FilterChip label={`Statut : ${STATUT_LABELS[statut]}`} onRemove={() => onStatutChange('')} />
          )}
          {priorite && (
            <FilterChip
              label={`Priorité : ${PRIORITE_LABELS[priorite]}`}
              onRemove={() => onPrioriteChange('')}
            />
          )}
          {direction && (
            <FilterChip
              label={`Direction : ${DIRECTION_LABELS[direction]}`}
              onRemove={() => onDirectionChange('')}
            />
          )}
          {search && <FilterChip label={`Recherche : ${search}`} onRemove={() => onSearchChange('')} />}
        </div>

        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset} className="h-8 text-anac-muted">
            Réinitialiser les filtres
          </Button>
        )}
      </div>
    </section>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-anac-border bg-white px-2 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded text-anac-muted outline-none hover:text-anac-danger focus-visible:ring-2 focus-visible:ring-anac-sky"
        aria-label={`Retirer le filtre ${label}`}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  );
}
