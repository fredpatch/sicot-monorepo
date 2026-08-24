import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CourrierDirection, CourrierSuiviStatut } from '../courrier.types';
import {
  COURRIER_DIRECTION_LABELS,
  COURRIER_DIRECTION_OPTIONS,
  COURRIER_PERIOD_OPTIONS,
  COURRIER_RESPONSE_FILTER_OPTIONS,
  COURRIER_STATUS_LABELS,
  COURRIER_STATUS_OPTIONS,
} from '../courrier.constants';

export function CourriersFilters({
  search,
  onSearchChange,
  direction,
  onDirectionChange,
  statut,
  onStatutChange,
  reponse,
  onReponseChange,
  periode,
  onPeriodeChange,
  periodeDebut,
  onPeriodeDebutChange,
  periodeFin,
  onPeriodeFinChange,
  resultCount,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  statut: string;
  onStatutChange: (value: string) => void;
  reponse: string;
  onReponseChange: (value: string) => void;
  periode: string;
  onPeriodeChange: (value: string) => void;
  periodeDebut: string;
  onPeriodeDebutChange: (value: string) => void;
  periodeFin: string;
  onPeriodeFinChange: (value: string) => void;
  resultCount: number;
  onReset: () => void;
}) {
  const hasFilters = Boolean(search || direction || statut || reponse || periode);

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
            placeholder="Rechercher par référence, objet, expéditeur ou destinataire…"
            className="h-9 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[620px] xl:grid-cols-4">
          <Select
            value={direction || '__all__'}
            onValueChange={(value) => onDirectionChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {COURRIER_DIRECTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statut || '__all__'}
            onValueChange={(value) => onStatutChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              {COURRIER_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={reponse || '__all__'}
            onValueChange={(value) => onReponseChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Réponse" />
            </SelectTrigger>
            <SelectContent>
              {COURRIER_RESPONSE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={periode || '__all__'}
            onValueChange={(value) => onPeriodeChange(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {COURRIER_PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {periode === 'personnalisee' && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-anac-border pt-3 sm:grid-cols-2 xl:w-[300px]">
          <Input
            type="date"
            value={periodeDebut}
            onChange={(event) => onPeriodeDebutChange(event.target.value)}
            className="h-9"
            aria-label="Date de début"
          />
          <Input
            type="date"
            value={periodeFin}
            onChange={(event) => onPeriodeFinChange(event.target.value)}
            className="h-9"
            aria-label="Date de fin"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
          <span className="font-medium text-anac-navy">
            {resultCount} résultat{resultCount > 1 ? 's' : ''}
          </span>
          {direction && (
            <FilterChip
              label={`Type : ${COURRIER_DIRECTION_LABELS[direction as CourrierDirection]}`}
              onRemove={() => onDirectionChange('')}
            />
          )}
          {statut && (
            <FilterChip
              label={`Statut : ${COURRIER_STATUS_LABELS[statut as CourrierSuiviStatut]}`}
              onRemove={() => onStatutChange('')}
            />
          )}
          {reponse && (
            <FilterChip
              label={`Réponse : ${
                COURRIER_RESPONSE_FILTER_OPTIONS.find((o) => o.value === reponse)?.label
              }`}
              onRemove={() => onReponseChange('')}
            />
          )}
          {periode && (
            <FilterChip
              label={`Période : ${COURRIER_PERIOD_OPTIONS.find((o) => o.value === periode)?.label}`}
              onRemove={() => onPeriodeChange('')}
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
