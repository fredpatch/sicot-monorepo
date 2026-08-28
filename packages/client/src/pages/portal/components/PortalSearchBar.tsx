// packages/client/src/pages/portal/components/PortalSearchBar.tsx
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PortalSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categorieActive: boolean;
  onResetCategorie: () => void;
}

// Intégrée directement sous le hero (§6 du brief) - plus de bande blanche
// sticky isolée autour d'un petit champ. Catégorie filtrée exclusivement via
// les cartes de navigation (PortalCategoryCards), pas de menu déroulant
// redondant ici.
export function PortalSearchBar({
  search,
  onSearchChange,
  categorieActive,
  onResetCategorie,
}: PortalSearchBarProps) {
  return (
    <div className="mt-6 flex gap-3">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-anac-muted"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Rechercher un document"
          placeholder="Rechercher un document…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-12 pl-11 text-[13px] rounded-xl border-transparent shadow-sm"
        />
      </div>
      {(search || categorieActive) && (
        <Button
          variant="secondary"
          onClick={() => {
            onSearchChange('');
            onResetCategorie();
          }}
          className="h-12 gap-1.5 px-4 rounded-xl"
          aria-label="Réinitialiser les filtres"
        >
          <X size={14} /> Réinitialiser
        </Button>
      )}
    </div>
  );
}
