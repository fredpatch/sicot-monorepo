// packages/client/src/pages/documents/documents.utils.ts
export function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

// Le service OCR ne se limite pas au FR/EN (voir documents.types.ts) — cette
// table couvre les langues courantes rencontrées et retombe sur le code brut
// en majuscules pour toute autre valeur, plutôt que de supposer FR/EN.
const LABELS_LANGUE: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
  it: 'Italiano',
};

export function formaterLangue(code?: string): string {
  if (!code) return '—';
  const label = LABELS_LANGUE[code.toLowerCase()];
  return label ? `${code.toUpperCase()} — ${label}` : code.toUpperCase();
}
