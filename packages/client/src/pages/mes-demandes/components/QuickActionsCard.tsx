// packages/client/src/pages/mes-demandes/components/QuickActionsCard.tsx
import { Link } from 'react-router-dom';
import { FolderOpen, LifeBuoy, Plane, Plus } from 'lucide-react';

export function QuickActionsCard({ onNouvelleDemande }: { onNouvelleDemande: () => void }) {
  return (
    <section className="card p-4">
      <h3 className="text-sm font-bold text-anac-navy">Actions rapides</h3>

      <div className="mt-3 space-y-1">
        <button
          type="button"
          onClick={onNouvelleDemande}
          className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-anac-gray"
        >
          <span className="rounded-md border border-blue-100 bg-blue-50 p-1.5 text-anac-blue">
            <Plus size={14} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-semibold text-anac-navy">Nouvelle demande</span>
            <span className="block text-[11px] text-anac-muted">Soumettre un document OCR ou un texte libre</span>
          </span>
        </button>

        <Link
          to="/documents"
          className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-anac-gray"
        >
          <span className="rounded-md border border-anac-border bg-anac-gray p-1.5 text-anac-muted">
            <FolderOpen size={14} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-semibold text-anac-navy">Parcourir les documents</span>
            <span className="block text-[11px] text-anac-muted">Voir les documents disponibles</span>
          </span>
        </Link>

        <Link
          to="/mes-missions"
          className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-anac-gray"
        >
          <span className="rounded-md border border-anac-border bg-anac-gray p-1.5 text-anac-muted">
            <Plane size={14} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-semibold text-anac-navy">Voir mes missions</span>
            <span className="block text-[11px] text-anac-muted">Accéder à mes missions et rapports</span>
          </span>
        </Link>
      </div>
    </section>
  );
}

export function HelpCard() {
  return (
    <section className="card p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-anac-border bg-anac-gray p-1.5 text-anac-muted">
          <LifeBuoy size={14} aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-anac-navy">Besoin d&apos;aide ?</h3>
        <span className="ml-auto rounded border border-anac-border bg-white px-1.5 py-0.5 text-[10px] font-semibold text-anac-muted">
          Bientôt disponible
        </span>
      </div>
      <p className="mt-2 text-xs text-anac-muted">
        Une section documentation sera bientôt accessible directement depuis cet écran.
      </p>
    </section>
  );
}
