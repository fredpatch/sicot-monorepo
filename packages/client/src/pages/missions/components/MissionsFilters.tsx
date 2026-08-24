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
import type { MissionStatut } from '@/lib/missions.api';
import {
  LOGISTIQUE_STATUS_OPTIONS,
  MISSION_STATUS_LABELS,
  MISSION_STATUS_OPTIONS,
  REPORT_FILTER_OPTIONS,
} from '../mission.constants';

export function MissionsFilters({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  pays,
  onPaysChange,
  confirmationLogistique,
  onLogistiqueChange,
  rapportStatut,
  onRapportChange,
  resultCount,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statut: string;
  onStatutChange: (value: string) => void;
  pays: string;
  onPaysChange: (value: string) => void;
  confirmationLogistique: string;
  onLogistiqueChange: (value: string) => void;
  rapportStatut: string;
  onRapportChange: (value: string) => void;
  resultCount: number;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasAdvancedFilters = Boolean(pays || confirmationLogistique || rapportStatut);
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
            placeholder="Rechercher une mission, une destination ou un pays…"
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
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              {MISSION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-anac-border pt-3 sm:grid-cols-3">
          <Input
            value={pays}
            onChange={(event) => onPaysChange(event.target.value)}
            placeholder="Pays"
            className="h-9"
          />

          <Select
            value={confirmationLogistique || '__all__'}
            onValueChange={(value) => onLogistiqueChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Logistique" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              {LOGISTIQUE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={rapportStatut || '__all__'}
            onValueChange={(value) => onRapportChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Rapport" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
              label={`Statut : ${MISSION_STATUS_LABELS[statut as MissionStatut]}`}
              onRemove={() => onStatutChange('')}
            />
          )}
          {pays && <FilterChip label={`Pays : ${pays}`} onRemove={() => onPaysChange('')} />}
          {confirmationLogistique && (
            <FilterChip
              label={`Logistique : ${
                LOGISTIQUE_STATUS_OPTIONS.find((o) => o.value === confirmationLogistique)?.label
              }`}
              onRemove={() => onLogistiqueChange('')}
            />
          )}
          {rapportStatut && (
            <FilterChip
              label={`Rapport : ${
                REPORT_FILTER_OPTIONS.find((o) => o.value === rapportStatut)?.label
              }`}
              onRemove={() => onRapportChange('')}
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
