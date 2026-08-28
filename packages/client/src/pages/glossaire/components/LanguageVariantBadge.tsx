import { LANGUE_LABELS } from '../glossary.constants';
import type { TermVariant } from '../glossary.adapters';

// Language is always shown as text (ISO code + label), never by flag alone -
// keeps the module accessible and future languages self-describing.
export function LanguageVariantBadge({ variant }: { variant: TermVariant }) {
  const code = variant.language.toUpperCase();
  const label = LANGUE_LABELS[variant.language] ?? variant.language;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className="inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded border border-anac-border bg-anac-gray px-1 text-[10px] font-semibold text-anac-navy"
        title={label}
      >
        {code}
      </span>
      <span className="text-anac-text">{variant.value}</span>
    </span>
  );
}
