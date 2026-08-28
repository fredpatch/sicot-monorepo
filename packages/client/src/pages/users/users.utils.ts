// packages/client/src/pages/utilisateurs/utilisateurs.utils.ts
export function getInitiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function formaterDateHeure(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
