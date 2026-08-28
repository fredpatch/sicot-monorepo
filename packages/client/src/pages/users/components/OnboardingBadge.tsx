// packages/client/src/pages/utilisateurs/components/BadgePremiereConnexion.tsx
//
// Distinct du statut du compte (BadgeStatutCompte) : un compte peut être actif
// tout en attendant encore sa première connexion (OTP envoyé, mot de passe pas
// encore défini) - voir users.schema.ts#premiereConnexion.
export function BadgePremiereConnexion({ premiereConnexion }: { premiereConnexion: boolean }) {
  return premiereConnexion ? (
    <span className="badge-attention">Première connexion requise</span>
  ) : (
    <span className="badge-neutre">Compte initialisé</span>
  );
}
