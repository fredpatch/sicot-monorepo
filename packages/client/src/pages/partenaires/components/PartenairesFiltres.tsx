import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { TYPES_FILTER } from '../partenaires.constants';
import type { OrganisationTypeFiltre } from '../partenaires.types';

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
  onReset: () => void;
  searchPlaceholder: string;
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
  onReset,
  searchPlaceholder,
}: PartenairesFiltresProps) {
  const aUnFiltreActif = search || type !== 'tous' || pays || region;

  return (
    <div className="card p-4 flex flex-wrap gap-3">
      <Input
        type="text"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-52"
      />

      {/* Filtre type */}
      <Select value={type} onValueChange={(v) => onTypeChange(v as OrganisationTypeFiltre)}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPES_FILTER.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre pays */}
      <Select value={pays || '__all__'} onValueChange={(v) => onPaysChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tous les pays" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tous les pays</SelectItem>
          {paysDisponibles?.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre région */}
      <Select value={region || '__all__'} onValueChange={(v) => onRegionChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Toutes les régions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Toutes les régions</SelectItem>
          {regionsDisponibles?.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {aUnFiltreActif && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
