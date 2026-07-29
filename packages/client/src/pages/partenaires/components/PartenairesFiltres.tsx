import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { CONTACT_QUALITY_OPTIONS, STATUS_FILTER, TYPES_FILTER } from '../partenaires.constants';
import type { ContactQualityFilter, OrganisationStatusFilter, OrganisationTypeFiltre } from '../partenaires.types';
import { getContactQualityLabel } from '../partenaires.utils';

interface PartenairesFiltresProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: OrganisationTypeFiltre;
  onTypeChange: (value: OrganisationTypeFiltre) => void;
  pays: string;
  onPaysChange: (value: string) => void;
  paysDisponibles?: string[];
  region: string;
  onRegionChange: (value: string) => void;
  regionsDisponibles?: string[];
  statut: OrganisationStatusFilter;
  onStatutChange: (value: OrganisationStatusFilter) => void;
  contactQuality: ContactQualityFilter;
  onContactQualityChange: (value: ContactQualityFilter) => void;
  resultCount: number;
  onReset: () => void;
}

export function PartenairesFiltres({
  search,
  onSearchChange,
  type,
  onTypeChange,
  pays,
  onPaysChange,
  paysDisponibles,
  region,
  onRegionChange,
  regionsDisponibles,
  statut,
  onStatutChange,
  contactQuality,
  onContactQualityChange,
  resultCount,
  onReset,
}: PartenairesFiltresProps) {
  const hasFilters = Boolean(search || type !== 'tous' || pays || region || statut !== 'tous' || contactQuality);

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-[260px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Rechercher un partenaire, un pays ou une organisation..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[760px] xl:grid-cols-5">
          <Select value={pays || '__all__'} onValueChange={(value) => onPaysChange(value === '__all__' ? '' : value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les pays</SelectItem>
              {paysDisponibles?.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={region || '__all__'} onValueChange={(value) => onRegionChange(value === '__all__' ? '' : value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les régions</SelectItem>
              {regionsDisponibles?.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={(value) => onTypeChange(value as OrganisationTypeFiltre)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPES_FILTER.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statut} onValueChange={(value) => onStatutChange(value as OrganisationStatusFilter)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={contactQuality || '__all__'}
            onValueChange={(value) => onContactQualityChange(value === '__all__' ? '' : (value as ContactQualityFilter))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Qualité contacts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les contacts</SelectItem>
              {CONTACT_QUALITY_OPTIONS.filter((option) => option.value).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
          {pays && <FilterChip label={`Pays : ${pays}`} onRemove={() => onPaysChange('')} />}
          {region && <FilterChip label={`Région : ${region}`} onRemove={() => onRegionChange('')} />}
          {type !== 'tous' && (
            <FilterChip
              label={`Type : ${TYPES_FILTER.find((option) => option.value === type)?.label ?? type}`}
              onRemove={() => onTypeChange('tous')}
            />
          )}
          {statut !== 'tous' && (
            <FilterChip
              label={`Statut : ${statut === 'actif' ? 'Actifs' : 'Inactifs'}`}
              onRemove={() => onStatutChange('tous')}
            />
          )}
          {contactQuality && (
            <FilterChip
              label={`Contacts : ${getContactQualityLabel(contactQuality)}`}
              onRemove={() => onContactQualityChange('')}
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
