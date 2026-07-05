// packages/client/src/pages/traductions/traductions.utils.ts
export function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function apercu(texte?: string): string {
  if (!texte) return '-';
  return texte.length > 80 ? texte.slice(0, 80) + '...' : texte;
}
