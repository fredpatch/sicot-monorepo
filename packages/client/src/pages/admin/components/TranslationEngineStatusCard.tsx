// packages/client/src/pages/admin/components/TranslationEngineStatusCard.tsx
import { CheckCircle2, XCircle } from 'lucide-react';
import type { StatutMoteurTraduction } from '../admin.types';

interface TranslationEngineStatusCardProps {
  status?: StatutMoteurTraduction;
  isLoading: boolean;
}

// Configuré ≠ utilisé : DeepL n'est qu'un fallback, jamais présenté comme
// actif juste parce qu'il est configuré (Phase 1 audit §25).
export function TranslationEngineStatusCard({ status, isLoading }: TranslationEngineStatusCardProps) {
  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-anac-navy">Moteur de traduction</p>

      {isLoading ? (
        <p className="mt-2 text-xs text-anac-muted">Chargement...</p>
      ) : !status ? (
        <p className="mt-2 text-xs text-anac-muted">Statut moteur de traduction indisponible.</p>
      ) : (
        <div className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-anac-muted">LibreTranslate</span>
            <span
              className={`flex items-center gap-1.5 font-medium ${
                status.accessible ? 'text-green-600' : 'text-anac-danger'
              }`}
            >
              {status.accessible ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {status.accessible ? 'Opérationnel' : 'Indisponible'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-anac-muted">Fallback DeepL</span>
            <span
              className={`font-medium ${status.deeplConfigure ? 'text-anac-navy' : 'text-anac-muted'}`}
            >
              {status.deeplConfigure ? 'Configuré' : 'Non configuré'}
            </span>
          </div>

          {status.erreur && <p className="text-xs text-anac-danger">{status.erreur}</p>}
        </div>
      )}
    </div>
  );
}
