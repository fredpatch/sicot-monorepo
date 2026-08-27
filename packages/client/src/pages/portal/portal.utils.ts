// packages/client/src/pages/portal/portal.utils.ts

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

const LANGUE_LABELS: Record<string, string> = {
  fr: 'FR — Français',
  en: 'EN — English',
  es: 'ES — Español',
};

// Le champ langue accepte plus que FR/EN/ES — on affiche un libellé connu
// quand disponible, sinon le code brut en majuscules (jamais un drapeau
// comme seul indicateur, cf. audit accessibilité).
export function formatLangue(langue?: string): string | undefined {
  if (!langue) return undefined;
  return LANGUE_LABELS[langue.toLowerCase()] ?? langue.toUpperCase();
}

export function formatLangueCourt(langue?: string): string | undefined {
  if (!langue) return undefined;
  return langue.toUpperCase();
}

export type PortalPreviewMode = 'pdf' | 'image' | 'unsupported';

export function getPreviewMode(mimeType: string): PortalPreviewMode {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  return 'unsupported';
}

export function formatDateAjout(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('fr-FR');
}

// Validation simple mais réelle (pas juste .includes('@')) — l'espace de
// tête/fin doit être retiré par l'appelant avant de tester. La casse du
// domaine n'a pas d'incidence (le serveur normalise déjà en minuscule).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValide(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
