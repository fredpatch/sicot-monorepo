// packages/client/src/pages/admin/admin.utils.ts
import { PARAMETER_SECTIONS } from './admin.constants';
import type { Parametre } from './admin.types';

// ── Déduire l'unité depuis la clé du paramètre ─────────────────────────────
export function uniteDepuisCle(cle: string): string {
  if (cle.endsWith('_jours')) return 'jours';
  if (cle.endsWith('_minutes')) return 'min';
  if (cle.endsWith('_nombre')) return 'sauvegarde(s)';
  return '';
}

// ── Seuils de tonalité pour une jauge d'usage (appels Gemini, quotas, etc.) ─
export function getUsageTone(utilises: number, max: number): 'danger' | 'attention' | 'succes' {
  const pourcentage = max > 0 ? (utilises / max) * 100 : 0;
  if (pourcentage >= 90) return 'danger';
  if (pourcentage >= 70) return 'attention';
  return 'succes';
}

// ── Regroupe les paramètres réels selon PARAMETER_SECTIONS (présentation),
// sans jamais en perdre un : toute clé non listée retombe dans « Autres »
// plutôt que d'être masquée silencieusement.
export function grouperParametresParSection(parametres: Parametre[]): { label: string; parametres: Parametre[] }[] {
  const parCle = new Map(parametres.map((p) => [p.cle, p]));
  const groupes: { label: string; parametres: Parametre[] }[] = [];

  for (const section of PARAMETER_SECTIONS) {
    const presents = section.keys.map((cle) => parCle.get(cle)).filter((p): p is Parametre => !!p);
    presents.forEach((p) => parCle.delete(p.cle));
    if (presents.length > 0) groupes.push({ label: section.label, parametres: presents });
  }

  const reste = Array.from(parCle.values());
  if (reste.length > 0) groupes.push({ label: 'Autres', parametres: reste });

  return groupes;
}
