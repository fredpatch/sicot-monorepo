// packages/client/src/pages/documents/components/DocumentPortailBadge.tsx
import { Globe, GlobeLock } from 'lucide-react';

// Remplace l'ancien bloc d'alerte pleine largeur dans la cellule du tableau
// par un badge compact texte + icône (jamais la couleur seule, voir
// convention SICOT sur les statuts).
export function DocumentPortailBadge({ expose }: { expose: boolean }) {
  return expose ? (
    <span className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
      <Globe size={12} /> Exposé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-lg border border-anac-border bg-anac-gray px-2 py-1 text-xs text-anac-muted">
      <GlobeLock size={12} /> Non exposé
    </span>
  );
}
