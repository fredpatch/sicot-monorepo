interface BadgeTypeProps {
  type: string;
}

export function BadgeType({ type }: BadgeTypeProps) {
  const config: Record<string, { label: string; classe: string }> = {
    anac_etrangere: { label: 'ANAC étrangère', classe: 'badge-info' },
    organisation_internationale: { label: 'Org. internationale', classe: 'badge-warning' },
    autre: { label: 'Autre', classe: 'badge-actif' },
  };
  const { label, classe } = config[type] ?? { label: type, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}
