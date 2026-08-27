// packages/client/src/pages/admin/components/GeminiUsageSection.tsx
import { Loader2, Sparkles, ThermometerSun } from 'lucide-react';
import { getModeleGeminiLabel } from '../admin.constants';
import { getUsageTone } from '../admin.utils';
import type { StatutGemini } from '../admin.types';

const TONE_CLASS: Record<ReturnType<typeof getUsageTone>, string> = {
  danger: 'bg-anac-danger',
  attention: 'bg-anac-attention',
  succes: 'bg-anac-succes',
};

function BarreUsage({ utilises, max }: { utilises: number; max: number }) {
  const pourcentage = max > 0 ? Math.min(100, Math.round((utilises / max) * 100)) : 0;
  const tone = getUsageTone(utilises, max);

  return (
    <div
      role="progressbar"
      aria-valuenow={utilises}
      aria-valuemin={0}
      aria-valuemax={max}
      className="mt-1.5 h-1.5 w-full rounded-full bg-anac-gray/60"
    >
      <div className={`h-1.5 rounded-full ${TONE_CLASS[tone]}`} style={{ width: `${pourcentage}%` }} />
    </div>
  );
}

interface GeminiUsageSectionProps {
  data?: StatutGemini;
  isLoading: boolean;
}

// Usage réel uniquement — aucune télémétrie fabriquée (Phase 1 audit §21).
// Se rafraîchit automatiquement toutes les 60s (voir useGeminiUsageQuery),
// pas de bouton de rafraîchissement manuel superflu.
export function GeminiUsageSection({ data, isLoading }: GeminiUsageSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-anac-muted">
          Usage IA (Rapports IA)
        </h3>
        <p className="mt-0.5 px-1 text-xs text-anac-muted">
          Plafonds auto-imposés, bien en dessous des vrais quotas gratuits — évite tout échec par
          quota au lieu de le gérer après coup. Actualisé automatiquement.
        </p>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-anac-muted">
          <Loader2 size={16} className="mr-2 inline animate-spin" />
          Chargement...
        </div>
      ) : !data ? (
        <p className="py-4 text-sm text-anac-muted">Suivi usage IA indisponible.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.modeles.map((m) => (
            <div key={m.modele} className="card p-4">
              <p className="text-sm font-semibold text-anac-navy">{getModeleGeminiLabel(m.modele)}</p>
              <p className="mt-0.5 text-xs text-anac-muted">
                {m.appelsAujourdhui} / {m.plafond} appels aujourd&apos;hui
              </p>
              <BarreUsage utilises={m.appelsAujourdhui} max={m.plafond} />
              <p className="mt-2 flex items-center gap-1 text-[10px] text-anac-muted/70">
                <ThermometerSun size={11} />
                {m.thinkingTokensAujourdhui.toLocaleString('fr-FR')} tokens de réflexion
                aujourd&apos;hui
              </p>
            </div>
          ))}

          <div className="card p-4">
            <p className="text-sm font-semibold text-anac-navy">Rapports IA à la demande</p>
            <p className="mt-0.5 text-xs text-anac-muted">
              {data.rapportsIA.utilises} / {data.rapportsIA.max} générés aujourd&apos;hui, tous
              utilisateurs
            </p>
            <BarreUsage utilises={data.rapportsIA.utilises} max={data.rapportsIA.max} />
          </div>

          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-anac-navy">
              <Sparkles size={13} /> Dernier rapport mensuel auto
            </p>
            {data.dernierRapportMensuel ? (
              <p className="mt-1.5 text-xs text-anac-muted">
                {new Date(data.dernierRapportMensuel.createdAt).toLocaleDateString('fr-FR')}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-anac-muted">Aucun généré pour l&apos;instant</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
