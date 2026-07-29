import { getOrganisationTypeLabel } from '../partenaires.utils';

export function OrganisationTypeBadge({ type }: { type: string }) {
  const tone =
    type === 'organisation_internationale'
      ? 'badge-info'
      : type === 'anac_etrangere'
        ? 'badge-warning'
        : 'badge-actif';

  return <span className={tone}>{getOrganisationTypeLabel(type)}</span>;
}
