// packages/client/src/pages/portal/components/PortalHeader.tsx

import { ShieldCheck } from 'lucide-react';

// En-tête public - délibérément séparé de la barre latérale interne
// (Layout.tsx) : aucun lien de connexion, aucune navigation interne. Hauteur
// restreinte. Sceau officiel ANAC (asset fourni, jamais redessiné/recoloré).
export function PortalHeader() {
  return (
    <header className="bg-anac-navy text-white">
      <div className="max-w-350 mx-auto px-6 lg:px-10 py-3 flex items-center gap-3">
        <ShieldCheck className="text-white relative z-10" size={24} strokeWidth={1.75} />
        <div className="leading-tight">
          <p className="text-sm font-bold">
            SICOT <span className="font-normal text-white/60">- ANAC Gabon</span>
          </p>
          <p className="text-[11px] text-white/50">
            Système Intégré de Coopération Internationale et de Traduction · Portail externe
          </p>
        </div>
      </div>
    </header>
  );
}
