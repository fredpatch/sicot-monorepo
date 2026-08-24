interface TranslationEngineStatusProps {
  accessible?: boolean;
  label?: string;
}

/** Compact engine-health indicator — a system condition, not a page-wide alarm. */
export function TranslationEngineStatus({
  accessible,
  label = 'LibreTranslate',
}: TranslationEngineStatusProps) {
  if (accessible === undefined) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        accessible ? 'text-anac-success' : 'text-anac-danger'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${accessible ? 'bg-anac-success' : 'bg-anac-danger'}`}
        aria-hidden="true"
      />
      {label} {accessible ? 'opérationnel' : 'hors ligne'}
    </span>
  );
}
