// packages/client/src/pages/demandes/components/RequestsFilters.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILTRES_STATUT, FILTRES_PRIORITE, FILTRES_ASSIGNATION } from '../requests.constants';

const STATUT_LABELS = Object.fromEntries(FILTRES_STATUT.map((f) => [f.value, f.label]));
const PRIORITE_LABELS = Object.fromEntries(FILTRES_PRIORITE.map((f) => [f.value, f.label]));
const ASSIGNATION_LABELS = Object.fromEntries(FILTRES_ASSIGNATION.map((f) => [f.value, f.label]));

interface RequestsFiltresProps {
  search: string;
  onSearchChange: (value: string) => void;
  statut: string;
  onStatutChange: (value: string) => void;
  priorite: string;
  onPrioriteChange: (value: string) => void;
  assignation: string;
  onAssignationChange: (value: string) => void;
  resultCount: number;
  onReset: () => void;
}

export function DemandesFiltres({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  priorite,
  onPrioriteChange,
  assignation,
  onAssignationChange,
  resultCount,
  onReset,
}: RequestsFiltresProps) {
  const [expanded, setExpanded] = useState(false);
  const hasAdvancedFilters = Boolean(priorite || assignation);
  const hasFilters = Boolean(search || statut || hasAdvancedFilters);

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un demandeur, un document, un texte…"
            className="h-9 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[380px]">
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

          <Button
            type="button"
            variant="outline"
            className="h-9 justify-between gap-2"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            Plus de filtres
            {expanded ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-anac-border pt-3 sm:grid-cols-2">
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
            value={assignation || '__all__'}
            onValueChange={(value) => onAssignationChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Assignation" />
            </SelectTrigger>
            <SelectContent>
              {FILTRES_ASSIGNATION.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
          {assignation && (
            <FilterChip
              label={`Assignation : ${ASSIGNATION_LABELS[assignation]}`}
              onRemove={() => onAssignationChange('')}
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
