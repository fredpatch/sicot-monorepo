import { parametres } from '@/db/schema';
import type { ParametreType, ParametreView } from './parametres.types';

export function toParametreView(p: typeof parametres.$inferSelect): ParametreView {
  return {
    id: p.id,
    cle: p.cle,
    valeur: p.valeur,
    type: p.type as ParametreType,
    module: p.module,
    description: p.description ?? undefined,
    modifiePar: p.modifiePar ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ── Validation de la valeur selon son type ────────────────────────────────
export function validerValeur(valeur: string, type: ParametreType): void {
  if (type === 'entier' && !/^\d+$/.test(valeur)) {
    throw new Error('VALEUR_INVALIDE_ENTIER');
  }
  if (type === 'booleen' && !['true', 'false'].includes(valeur)) {
    throw new Error('VALEUR_INVALIDE_BOOLEEN');
  }
  // texte : pas de contrainte particulière
}
