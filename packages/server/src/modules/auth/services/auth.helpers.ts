import { db } from '@/db/index.js';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, TokenPayload } from '@/utils/jwt';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';
import type { AuthTokens, UserPublic } from './auth.types';

// ── Incrémenter les tentatives échouées ───────────────────────────────────
export async function handleEchecConnexion(
  userId: number,
  tentativesActuelles: number
): Promise<void> {
  const tentatives = tentativesActuelles + 1;
  const updates: Record<string, unknown> = { tentativesEchouees: tentatives };

  const maxTentatives = await getValeurEntier('lockout_max_tentatives', 5);
  if (tentatives >= maxTentatives) {
    const dureeBlocage = await getValeurEntier('lockout_duree_minutes', 30);
    const blocageDate = new Date();
    blocageDate.setMinutes(blocageDate.getMinutes() + dureeBlocage);
    updates.bloqueJusquA = blocageDate;
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

// ── Réinitialiser les tentatives après succès ─────────────────────────────
export async function resetTentatives(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ tentativesEchouees: 0, bloqueJusquA: null })
    .where(eq(users.id, userId));
}

// ── Construire les tokens depuis un utilisateur ───────────────────────────
export function buildTokens(user: { id: number; matricule: string; role: string }): AuthTokens {
  const payload: TokenPayload = {
    userId: user.id,
    matricule: user.matricule,
    role: user.role,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ── Construire la vue publique d'un utilisateur ───────────────────────────
export function buildUserPublic(user: {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  role: string;
}): UserPublic {
  return {
    id: user.id,
    matricule: user.matricule,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
  };
}
