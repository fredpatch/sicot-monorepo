export function OrganisationStatusBadge({ actif }: { actif: boolean }) {
  return actif ? (
    <span className="badge-actif">Actif</span>
  ) : (
    <span className="badge-expire">Inactif</span>
  );
}
