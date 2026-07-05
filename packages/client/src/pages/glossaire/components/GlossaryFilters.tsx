// packages/client/src/pages/glossaire/components/GlossaireFilters.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GlossaireFiltresProps {
  search: string;
  onSearchChange: (value: string) => void;
  domaine: string;
  onDomaineChange: (value: string) => void;
  domaines: string[];
  afficherInactifs: boolean;
  onAfficherInactifsChange: (value: boolean) => void;
  onReset: () => void;
}

export function GlossaireFiltres({
  search,
  onSearchChange,
  domaine,
  onDomaineChange,
  domaines,
  afficherInactifs,
  onAfficherInactifsChange,
  onReset,
}: GlossaireFiltresProps) {
  const aUnFiltreActif = search !== '' || domaine !== '' || afficherInactifs;

  return (
    <div className="card p-4 flex flex-wrap gap-3 items-center">
      <Input
        type="text"
        placeholder="Rechercher FR ou EN..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />

      <Select
        value={domaine || '__all__'}
        onValueChange={(v) => onDomaineChange(v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tous les domaines" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tous les domaines</SelectItem>
          {domaines.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={afficherInactifs}
          onChange={(e) => onAfficherInactifsChange(e.target.checked)}
          className="rounded border-gray-300 text-anac-sky focus:ring-anac-sky"
        />
        <span className="text-sm text-anac-muted">Afficher les inactifs</span>
      </label>

      {aUnFiltreActif && (
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
