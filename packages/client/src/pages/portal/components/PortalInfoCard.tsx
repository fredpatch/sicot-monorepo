// packages/client/src/pages/portal/components/PortalInfoCard.tsx
import { Info } from 'lucide-react';

export function PortalInfoCard() {
  return (
    <div className="bg-white/6 border border-white/15 rounded-xl px-4 py-3.5 flex gap-2.5">
      <Info size={16} className="text-anac-sky shrink-0 mt-0.5" />
      <div className="text-xs">
        <p className="font-medium text-white">À propos de ce portail</p>
        <p className="text-white/60 mt-1 leading-relaxed">
          Ce portail donne accès uniquement aux documents publiés pour consultation externe.
          Documents internes non publiés : jamais accessibles ici.
        </p>
      </div>
    </div>
  );
}
