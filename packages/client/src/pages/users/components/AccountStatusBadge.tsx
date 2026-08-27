// packages/client/src/pages/utilisateurs/components/BadgeStatutCompte.tsx
export function BadgeStatutCompte({ actif }: { actif: boolean }) {
  return actif ? <span className="badge-actif">Actif</span> : <span className="badge-expire">Désactivé</span>;
}
