import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACCORD_STATUS_OPTIONS } from '../accord.constants';
import type { ExpiryFilter, OrganisationOption } from '../accord.types';
import { getStatusLabel } from '../accord.utils';
import type { AccordStatut } from '@/lib/accords.api';

export function AccordFilters({
  search,
  onSearchChange,
  statut,
  onStatutChange,
  partenaireId,
  onPartenaireChange,
  expiry,
  onExpiryChange,
  organisations,
  resultCount,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statut: string;
  onStatutChange: (value: string) => void;
  partenaireId: string;
  onPartenaireChange: (value: string) => void;
  expiry: ExpiryFilter;
  onExpiryChange: (value: ExpiryFilter) => void;
  organisations: OrganisationOption[];
  resultCount: number;
  onReset: () => void;
}) {
  const hasFilters = Boolean(search || statut || partenaireId || expiry);
  const partner = organisations.find((org) => org.id.toString() === partenaireId);

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
            placeholder="Rechercher un accord, un partenaire ou une référence..."
            className="h-9 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[560px]">
          <Select value={statut || '__all__'} onValueChange={(value) => onStatutChange(value === '__all__' ? '' : value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              {ACCORD_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={partenaireId || '__all__'}
            onValueChange={(value) => onPartenaireChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Partenaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les partenaires</SelectItem>
              {organisations.map((org) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.nom} - {org.pays}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={expiry || '__all__'}
            onValueChange={(value) => onExpiryChange(value === '__all__' ? '' : (value as ExpiryFilter))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Échéance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les échéances</SelectItem>
              <SelectItem value="expired">Expirés</SelectItem>
              <SelectItem value="30">Moins de 30 jours</SelectItem>
              <SelectItem value="90">Moins de 90 jours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
          <span className="font-medium text-anac-navy">{resultCount} résultat{resultCount > 1 ? 's' : ''}</span>
          {statut && <FilterChip label={`Statut : ${getStatusLabel(statut as AccordStatut)}`} onRemove={() => onStatutChange('')} />}
          {partner && <FilterChip label={`Partenaire : ${partner.nom}`} onRemove={() => onPartenaireChange('')} />}
          {expiry && <FilterChip label={`Échéance : ${expiry === 'expired' ? 'Expirés' : `moins de ${expiry} jours`}`} onRemove={() => onExpiryChange('')} />}
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

