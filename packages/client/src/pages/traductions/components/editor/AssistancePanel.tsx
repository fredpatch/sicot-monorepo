import type { TraductionDirection } from '@/lib/traductions.api';
import type { Traduction } from '../../traductions.types';
import { EngineStatusBlock } from './EngineStatusBlock';
import { SourceInfoBlock } from './SourceInfoBlock';
import { GlossarySuggestions, type SuggestionGlossaire } from './GlossarySuggestions';

interface AssistancePanelProps {
  traduction: Traduction;
  moteurAccessible?: boolean;
  direction: TraductionDirection;
  selectionTexte: string;
  suggestions: SuggestionGlossaire[];
  afficherSuggestions: boolean;
  onApplySuggestion: (suggestion: SuggestionGlossaire) => void;
  onCloseSuggestions: () => void;
}

export function AssistancePanel({
  traduction,
  moteurAccessible,
  direction,
  selectionTexte,
  suggestions,
  afficherSuggestions,
  onApplySuggestion,
  onCloseSuggestions,
}: AssistancePanelProps) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <EngineStatusBlock moteurUtilise={traduction.moteurUtilise} moteurAccessible={moteurAccessible} />
      {afficherSuggestions && (
        <GlossarySuggestions
          direction={direction}
          selectionTexte={selectionTexte}
          suggestions={suggestions}
          onApply={onApplySuggestion}
          onClose={onCloseSuggestions}
        />
      )}
      <SourceInfoBlock traduction={traduction} />
      {!afficherSuggestions && (
        <p className="text-[11px] text-anac-muted">
          Sélectionnez du texte dans les panneaux pour voir les suggestions du glossaire.
        </p>
      )}
    </div>
  );
}
