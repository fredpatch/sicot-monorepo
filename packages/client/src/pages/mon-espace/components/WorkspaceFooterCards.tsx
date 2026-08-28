// packages/client/src/pages/mon-espace/components/WorkspaceFooterCards.tsx
import { Link } from 'react-router-dom';
import { FolderOpen, LifeBuoy, ArrowRight } from 'lucide-react';

export function WorkspaceFooterCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="card flex items-start gap-3 p-5">
        <span className="rounded-md border border-blue-100 bg-blue-50 p-2 text-anac-blue">
          <FolderOpen size={18} aria-hidden="true" />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-anac-navy">Accès aux documents</h4>
          <p className="mt-1 text-xs text-anac-muted">
            Consultez les documents archivés et disponibles pour les demandes.
          </p>
          <Link
            to="/documents"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue hover:text-anac-navy"
          >
            Parcourir les documents <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="card flex items-start gap-3 p-5">
        <span className="rounded-md border border-anac-border bg-anac-gray p-2 text-anac-muted">
          <LifeBuoy size={18} aria-hidden="true" />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-anac-navy">Besoin d&apos;aide ?</h4>
          <p className="mt-1 text-xs text-anac-muted">
            Guides et explications sur le fonctionnement de SICOT.
          </p>
          <Link
            to="/aide"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue hover:text-anac-navy"
          >
            Ouvrir le centre d&apos;aide <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
