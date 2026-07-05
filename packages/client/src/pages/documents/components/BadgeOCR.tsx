// packages/client/src/pages/documents/components/BadgeOCR.tsx
export function BadgeOCR({ statut }: { statut: string }) {
  const config: Record<string, { label: string; classe: string }> = {
    traite: { label: 'Traité', classe: 'badge-actif' },
    en_attente: { label: 'En attente', classe: 'badge-info' },
    a_retraiter: { label: 'À retraiter', classe: 'badge-warning' },
    echec: { label: 'Échec', classe: 'badge-expire' },
  };
  const { label, classe } = config[statut] ?? { label: statut, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}
