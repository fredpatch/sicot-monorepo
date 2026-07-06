// packages/client/src/pages/utilisateurs/components/UtilisateursFilters.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FILTRES_ROLE, FILTRES_STATUT } from '../users.constants';

interface UtilisateursFiltresProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  actif: string;
  onActifChange: (value: string) => void;
  onReset: () => void;
}

export function UtilisateursFiltres({
  search,
  onSearchChange,
  role,
  onRoleChange,
  actif,
  onActifChange,
  onReset,
}: UtilisateursFiltresProps) {
  const aUnFiltreActif = search !== '' || role !== '' || actif !== '';

  return (
    <div className="card p-4 flex flex-wrap gap-3">
      <Input
        type="text"
        placeholder="Rechercher matricule, nom, prénom..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />

      <Select value={role || '__all__'} onValueChange={(v) => onRoleChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_ROLE.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={actif || '__all__'} onValueChange={(v) => onActifChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTRES_STATUT.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
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