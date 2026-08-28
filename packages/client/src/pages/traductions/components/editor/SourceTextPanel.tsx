import { RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { Traduction } from '../../traductions.types';

interface SourceTextPanelProps {
  traduction: Traduction;
  onSelection: () => void;
}

export function SourceTextPanel({ traduction, onSelection }: SourceTextPanelProps) {
  const label =
    traduction.direction === 'fr_en' ? 'Texte original - Français' : 'Original text - English';
  const modifieDepuisIA =
    traduction.texteIA && traduction.texteFinal && traduction.texteIA !== traduction.texteFinal;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden" aria-label={label}>
      <div className="flex items-center justify-between shrink-0">
        <Label className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
          {label}
        </Label>
        <span className="text-[11px] text-anac-muted">
          {traduction.texteOriginal?.length ?? 0} car.
        </span>
      </div>

      <div
        className="flex-1 overflow-y-auto rounded-lg border border-anac-border bg-anac-gray/30 p-4 text-sm leading-relaxed text-anac-text font-mono whitespace-pre-wrap select-text"
        onMouseUp={onSelection}
      >
        {traduction.texteOriginal ?? (
          <span className="italic text-anac-muted">Aucun texte original.</span>
        )}
      </div>

      {modifieDepuisIA && (
        <div className="flex items-center gap-1.5 text-[11px] text-anac-muted shrink-0">
          <RefreshCw size={10} />
          Traduction modifiée par rapport à la version IA - delta sauvegardé dans le glossaire
        </div>
      )}
    </div>
  );
}
