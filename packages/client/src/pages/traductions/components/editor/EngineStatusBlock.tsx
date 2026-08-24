import { TranslationEngineStatus } from '../TranslationEngineStatus';

interface EngineStatusBlockProps {
  moteurUtilise: string;
  moteurAccessible?: boolean;
}

/** Separates the engine that produced this record from current engine health — a past
 * translation's `moteurUtilise` never changes when live engine health changes later. */
export function EngineStatusBlock({ moteurUtilise, moteurAccessible }: EngineStatusBlockProps) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-anac-muted">
        Moteur de traduction
      </p>
      <div>
        <p className="text-[11px] text-anac-muted">Utilisé pour cette traduction</p>
        <p className="text-sm font-medium capitalize text-anac-navy">{moteurUtilise}</p>
      </div>
      <div>
        <p className="text-[11px] text-anac-muted">État actuel</p>
        <TranslationEngineStatus accessible={moteurAccessible} />
      </div>
    </div>
  );
}
