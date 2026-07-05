// packages/client/src/pages/glossaire/glossaire.utils.ts
export function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}
