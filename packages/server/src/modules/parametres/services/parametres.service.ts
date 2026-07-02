import { db } from '@/db/index.js';
import { parametres } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { toParametreView, validerValeur } from './parametres.helpers';
import type { ParametreType, ParametreView } from './parametres.types';

export type { ParametreType, ParametreView } from './parametres.types';

// ── SERVICE : Lister tous les paramètres ──────────────────────────────────
export async function listerParametres(module?: string): Promise<ParametreView[]> {
  const rows = module
    ? await db.select().from(parametres).where(eq(parametres.module, module))
    : await db.select().from(parametres);

  return rows
    .map(toParametreView)
    .sort((a, b) => a.module.localeCompare(b.module) || a.cle.localeCompare(b.cle));
}

// ── SERVICE : Récupérer un paramètre par clé ──────────────────────────────
export async function getParametre(cle: string): Promise<ParametreView> {
  const [param] = await db.select().from(parametres).where(eq(parametres.cle, cle));
  if (!param) throw new Error('PARAMETRE_INTROUVABLE');
  return toParametreView(param);
}

// ── SERVICE : Récupérer la valeur typée d'un paramètre (usage interne) ───
// Utilisé par les autres services (alertes, etc.) pour lire un seuil
export async function getValeurEntier(cle: string, defaut: number): Promise<number> {
  const [param] = await db.select().from(parametres).where(eq(parametres.cle, cle));
  if (!param) return defaut;
  const n = parseInt(param.valeur);
  return isNaN(n) ? defaut : n;
}

export async function getValeurBooleen(cle: string, defaut: boolean): Promise<boolean> {
  const [param] = await db.select().from(parametres).where(eq(parametres.cle, cle));
  if (!param) return defaut;
  return param.valeur === 'true';
}

// ── SERVICE : Mettre à jour un paramètre ──────────────────────────────────
export async function mettreAJourParametre(
  cle: string,
  valeur: string,
  userId: number
): Promise<ParametreView> {
  const [existant] = await db.select().from(parametres).where(eq(parametres.cle, cle));
  if (!existant) throw new Error('PARAMETRE_INTROUVABLE');

  validerValeur(valeur, existant.type as ParametreType);

  const [updated] = await db
    .update(parametres)
    .set({ valeur, modifiePar: userId, updatedAt: new Date() })
    .where(eq(parametres.cle, cle))
    .returning();

  await logAudit({
    userId,
    action: 'PARAMETRE_MODIFIE',
    module: 'ADMIN',
    entiteId: updated.id,
    details: { cle, ancienneValeur: existant.valeur, nouvelleValeur: valeur },
  });

  return toParametreView(updated);
}

// ── SERVICE : Créer un nouveau paramètre (rare, usage migration) ─────────
export async function creerParametre(params: {
  cle: string;
  valeur: string;
  type: ParametreType;
  module: string;
  description?: string;
  userId: number;
}): Promise<ParametreView> {
  validerValeur(params.valeur, params.type);

  const [param] = await db
    .insert(parametres)
    .values({
      cle: params.cle,
      valeur: params.valeur,
      type: params.type,
      module: params.module,
      description: params.description,
      modifiePar: params.userId,
    })
    .returning();

  await logAudit({
    userId: params.userId,
    action: 'PARAMETRE_CREE',
    module: 'ADMIN',
    entiteId: param.id,
    details: { cle: params.cle },
  });

  return toParametreView(param);
}
