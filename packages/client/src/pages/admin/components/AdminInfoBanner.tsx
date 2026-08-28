// packages/client/src/pages/admin/components/AdminInfoBanner.tsx
import { Info } from 'lucide-react';

interface AdminInfoBannerProps {
  peutModifier: boolean;
}

// Copie volontairement précise sur la prise d'effet : seul le seuil
// d'alerte accord dépend d'un cycle cron (08h00) - tous les autres
// paramètres (courriers, sécurité, sauvegardes, IA) sont lus en direct à
// chaque usage, donc appliqués immédiatement. Généraliser « prochain cycle »
// à tous les paramètres serait inexact (Phase 1 audit).
export function AdminInfoBanner({ peutModifier }: AdminInfoBannerProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <Info size={14} className="mt-0.5 shrink-0" />
      <p>
        Les modifications de paramètres sont journalisées dans le Journal d&apos;audit. La plupart
        prennent effet immédiatement ; seul le seuil d&apos;alerte accord s&apos;applique au
        prochain cycle planifié (08h00) - indiqué directement sur sa carte.
        {!peutModifier && (
          <>
            {' '}
            Réservé Super Admin pour la modification - vous consultez ces paramètres en lecture
            seule.
          </>
        )}
      </p>
    </div>
  );
}
