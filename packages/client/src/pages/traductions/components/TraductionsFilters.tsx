// packages/client/src/pages/traductions/components/TraductionsFilters.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TraductionVue } from '@/lib/traductions.api';
import { FILTRES_STATUT, FILTRES_DIRECTION, FILTRES_SOURCE } from '../traductions.constants';

const STATUT_LABELS = Object.fromEntries(FILTRES_STATUT.map((f) => [f.value, f.label]));
const DIRECTION_LABELS = Object.fromEntries(FILTRES_DIRECTION.map((f) => [f.value, f.label]));
const SOURCE_LABELS = Object.fromEntries(FILTRES_SOURCE.map((f) => [f.value, f.label]));

interface TraductionsFiltresProps {
  search: string;
  onSearchChange: (value: string) => void;
  statut: string;
  onStatutChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  vue: TraductionVue;
  onVueChange: (vue: TraductionVue) => void;
  supprimeesCount?: number;
  resultCount: number;
  onReset: () => void;
}

export function TraductionsFiltres({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  direction,
  onDirectionChange,
  source,
  onSourceChange,
  vue,
  onVueChange,
  supprimeesCount,
  resultCount,
  onReset,
}: TraductionsFiltresProps) {
  const [expanded, setExpanded] = useState(false);
  const hasAdvancedFilters = Boolean(direction || source);
  const hasFilters = Boolean(search || statut || hasAdvancedFilters);

  return (
    <section className="card p-4">
      <div className="mb-3 inline-flex rounded-lg border border-anac-border p-0.5">
        <button
          type="button"
          onClick={() => onVueChange('actives')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            vue === 'actives' ? 'bg-anac-navy text-white' : 'text-anac-muted hover:text-anac-navy'
          )}
        >
          Traductions
        </button>
        <button
          type="button"
          onClick={() => onVueChange('supprimees')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            vue === 'supprimees' ? 'bg-anac-navy text-white' : 'text-anac-muted hover:text-anac-navy'
          )}
        >
          <Trash2 size={12} aria-hidden="true" />
          Supprimées
          {Boolean(supprimeesCount) && (
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px]',
                vue === 'supprimees' ? 'bg-white/20' : 'bg-anac-gray'
              )}
            >
              {supprimeesCount}
            </span>
          )}
        </button>
      </div>

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
            placeholder="Rechercher dans le texte original…"
            className="h-9 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[380px]">
          {vue === 'actives' ? (
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
          ) : (
            <div />
          )}

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

          <Select
            value={source || '__all__'}
            onValueChange={(value) => onSourceChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {FILTRES_SOURCE.map((f) => (
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
            <FilterChip
              label={`Statut : ${STATUT_LABELS[statut]}`}
              onRemove={() => onStatutChange('')}
            />
          )}
          {direction && (
            <FilterChip
              label={`Direction : ${DIRECTION_LABELS[direction]}`}
              onRemove={() => onDirectionChange('')}
            />
          )}
          {source && (
            <FilterChip
              label={`Source : ${SOURCE_LABELS[source]}`}
              onRemove={() => onSourceChange('')}
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
