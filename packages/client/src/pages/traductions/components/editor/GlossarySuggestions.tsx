import { BookOpen } from 'lucide-react';
import type { TraductionDirection } from '@/lib/traductions.api';

interface SuggestionGlossaire {
  termeFr: string;
  termeEn: string;
  domaine?: string;
}

interface GlossarySuggestionsProps {
  direction: TraductionDirection;
  selectionTexte: string;
  suggestions: SuggestionGlossaire[];
  onApply: (suggestion: SuggestionGlossaire) => void;
  onClose: () => void;
}

export function GlossarySuggestions({
  direction,
  selectionTexte,
  suggestions,
  onApply,
  onClose,
}: GlossarySuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-anac-sky/30 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-anac-border px-3 py-2">
        <BookOpen size={12} className="text-anac-sky" />
        <span className="text-xs font-medium text-anac-navy">
          Glossaire pour &quot;{selectionTexte}&quot;
        </span>
        <button onClick={onClose} className="ml-auto text-xs text-anac-muted hover:text-anac-navy">
          ✕
        </button>
      </div>
      <div className="max-h-40 divide-y divide-anac-border/50 overflow-y-auto">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onApply(s)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-anac-sky/5"
          >
            <span className="text-xs font-medium text-anac-navy">
              {direction === 'fr_en' ? s.termeFr : s.termeEn}
            </span>
            <span className="text-xs text-anac-muted">→</span>
            <span className="text-xs font-medium text-anac-sky">
              {direction === 'fr_en' ? s.termeEn : s.termeFr}
            </span>
            {s.domaine && <span className="ml-auto text-[10px] text-anac-muted">{s.domaine}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { SuggestionGlossaire };
