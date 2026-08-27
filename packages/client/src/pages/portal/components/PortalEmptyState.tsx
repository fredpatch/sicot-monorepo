// packages/client/src/pages/portal/components/PortalEmptyState.tsx
import { FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortalEmptyStateProps {
  // 'global' = aucun document publié nulle part (§31) ; 'categorie' /
  // 'filtre' = résultat vide pour la sélection courante (§32), jamais le
  // même message que l'état global.
  variant: 'global' | 'categorie' | 'filtre';
  categorieLabel?: string;
  onReset?: () => void;
}

export function PortalEmptyState({ variant, categorieLabel, onReset }: PortalEmptyStateProps) {
  if (variant === 'global') {
    return (
      <div className="text-center py-20 text-anac-muted">
        <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium text-anac-navy">
          Aucun document public n&apos;est disponible pour le moment.
        </p>
        <p className="text-xs mt-1">Les documents publiés par l&apos;ANAC apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-20 text-anac-muted">
      <FileText size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">
        {variant === 'categorie'
          ? `Aucun document disponible dans la catégorie « ${categorieLabel} ».`
          : 'Aucun document ne correspond à votre recherche.'}
      </p>
      {onReset && (
        <Button variant="secondary" size="sm" onClick={onReset} className="mt-4">
          Afficher tous les documents
        </Button>
      )}
    </div>
  );
}
