import { Label } from '@/components/ui/label';
import type { Traduction } from '../../traductions.types';

interface TranslationPanelProps {
  traduction: Traduction;
  texteFinal: string;
  onChange: (texte: string) => void;
  onSelection: () => void;
  modifie: boolean;
  estArchivee: boolean;
  estApprouvee: boolean;
}

export function TranslationPanel({
  traduction,
  texteFinal,
  onChange,
  onSelection,
  modifie,
  estArchivee,
  estApprouvee,
}: TranslationPanelProps) {
  const label = traduction.direction === 'fr_en' ? 'Traduction — Anglais' : 'Traduction — Français';

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden" aria-label={label}>
      <div className="flex items-center justify-between shrink-0">
        <Label className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
          {label}
          {modifie && (
            <span className="ml-2 text-[10px] font-normal normal-case text-anac-warning">
              • Modifications non sauvegardées
            </span>
          )}
        </Label>
        <span className="text-[11px] text-anac-muted">{texteFinal.length} car.</span>
      </div>

      <textarea
        value={texteFinal}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={onSelection}
        disabled={estArchivee}
        className={`flex-1 resize-none rounded-lg border border-anac-border p-4 font-mono text-sm leading-relaxed text-anac-text
          focus:outline-none focus:ring-1 focus:ring-anac-sky
          ${estArchivee ? 'cursor-not-allowed bg-anac-gray/30 opacity-70' : 'bg-white'}
          ${estApprouvee ? 'border-green-200 bg-green-50/40' : ''}`}
        placeholder={
          estArchivee
            ? 'Traduction archivée — lecture seule.'
            : traduction.statut === 'manuelle_requise'
              ? 'Saisissez la traduction manuellement...'
              : 'Révisez la traduction ici...'
        }
      />
    </div>
  );
}
