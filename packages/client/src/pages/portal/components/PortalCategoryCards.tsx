// packages/client/src/pages/portal/components/PortalCategoryCards.tsx
import { FileText, ArrowRight, Loader2 } from 'lucide-react';
import {
  PORTAL_CATEGORY_ORDER,
  PORTAL_CATEGORY_DESCRIPTIONS,
  getPortalCategoryLabel,
} from '../portal.constants';
import { usePortalAggregatesQuery } from '../hooks/queries';

interface PortalCategoryCardsProps {
  categorieActive: string;
  onSelect: (categorie: string) => void;
}

// Cartes de découverte publique - icône et titre sur la même ligne,
// hauteur compacte (~130-150px), compteurs réels
// (GET /portal/documents/aggregates), jamais décoratifs. Les catégories à
// 0 document restent visibles/sélectionnables (juste atténuées), pas
// désactivées - filtrer dessus doit correctement montrer l'état vide filtré.
export function PortalCategoryCards({ categorieActive, onSelect }: PortalCategoryCardsProps) {
  const { data, isLoading } = usePortalAggregatesQuery();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
      {PORTAL_CATEGORY_ORDER.map((categorie) => {
        const actif = categorieActive === categorie;
        const count = data?.parCategorie[categorie] ?? 0;
        const vide = !isLoading && count === 0;
        return (
          <button
            key={categorie}
            type="button"
            aria-pressed={actif}
            onClick={() => onSelect(actif ? '' : categorie)}
            className={`text-left rounded-xl border p-3.5 transition-colors group ${
              actif
                ? 'border-anac-sky bg-anac-sky/8 ring-1 ring-anac-sky/30'
                : 'border-anac-border bg-white hover:border-anac-sky/40 hover:bg-anac-sky/3'
            } ${vide ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-anac-navy/8 flex items-center justify-center shrink-0">
                <FileText size={15} className="text-anac-navy" />
              </div>
              <p className="text-sm font-semibold text-anac-navy truncate">
                {getPortalCategoryLabel(categorie)}
              </p>
            </div>
            <p className="text-xs text-anac-muted mt-2 leading-snug line-clamp-2">
              {PORTAL_CATEGORY_DESCRIPTIONS[categorie]}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-anac-sky">
              <span className="tabular-nums">
                {isLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  `${count} document${count > 1 ? 's' : ''}`
                )}
              </span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
