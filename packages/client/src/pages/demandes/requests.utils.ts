// packages/client/src/pages/demandes/requests.utils.ts
export function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function apercu(texte?: string): string {
  if (!texte) return '—';
  return texte.length > 60 ? texte.slice(0, 60) + '...' : texte;
}
