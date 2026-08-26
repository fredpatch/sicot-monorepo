// Shared server-side password policy — mirrors the checklist already shown
// to users by the client's <PasswordStrength> component (login/components),
// so the rule is enforced everywhere it's displayed, not just client-side.
export function validerForceMotDePasse(motDePasse: string): void {
  if (motDePasse.length < 8) throw new Error('MOT_DE_PASSE_TROP_COURT');
  if (!/[A-Z]/.test(motDePasse) || !/[0-9]/.test(motDePasse) || !/[^A-Za-z0-9]/.test(motDePasse)) {
    throw new Error('MOT_DE_PASSE_COMPLEXITE_INSUFFISANTE');
  }
}
