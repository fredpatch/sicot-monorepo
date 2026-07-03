import bcrypt from 'bcryptjs';
import { db } from '@/db/index.js';
import { users, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { signAccessToken, verifyRefreshToken } from '@/utils/jwt';
import { verifyOTP, isOTPExpired, generateOTP, hashOTP, otpExpiresAt } from '@/utils/otp';
import { sendOTPEmail } from '@/utils/email.js';
import { SALT_ROUNDS } from './auth.constants';
import {
  handleEchecConnexion,
  resetTentatives,
  buildTokens,
  buildUserPublic,
} from './auth.helpers';
import type { AuthTokens, UserPublic, LoginResult } from './auth.types';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service';

export type { AuthTokens, UserPublic, LoginResult } from './auth.types';

// ── Utilitaire audit ──────────────────────────────────────────────────────
// Importé dans de nombreux modules (missions, accords, courriers, documents,
// etc.) — ne pas relocaliser sans un balayage complet des imports.
export async function logAudit(params: {
  userId?: number;
  action: string;
  module: string;
  entiteId?: number;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await db.insert(auditLogs).values({
    userId: params.userId,
    action: params.action,
    module: params.module,
    entiteId: params.entiteId,
    details: params.details,
    ip: params.ip,
  });
}

// ── SERVICE : Connexion ───────────────────────────────────────────────────
export async function login(params: {
  matricule: string;
  otp?: string;
  motDePasse?: string;
  ip?: string;
}): Promise<LoginResult> {
  const { matricule, otp, motDePasse, ip } = params;

  const [user] = await db.select().from(users).where(eq(users.matricule, matricule));

  if (!user || !user.actif) {
    throw new Error('COMPTE_INTROUVABLE');
  }

  if (user.bloqueJusquA && new Date() < user.bloqueJusquA) {
    throw new Error('COMPTE_BLOQUE');
  }

  // ── Cas 1 : Première connexion avec OTP ───────────────────────────────
  if (user.premiereConnexion) {
    if (!otp) throw new Error('OTP_REQUIS');
    if (!user.otpHash || !user.otpExpiresAt) throw new Error('OTP_NON_GENERE');
    if (isOTPExpired(user.otpExpiresAt)) throw new Error('OTP_EXPIRE');

    const otpValide = await verifyOTP(otp, user.otpHash);
    if (!otpValide) {
      await handleEchecConnexion(user.id, user.tentativesEchouees ?? 0);
      throw new Error('OTP_INVALIDE');
    }

    await resetTentatives(user.id);
    await logAudit({ userId: user.id, action: 'OTP_VALIDE', module: 'M10', ip });

    // Token temporaire valable 5 minutes pour sécuriser /set-password
    const tempAccessToken = signAccessToken({
      userId: user.id,
      matricule: user.matricule,
      role: 'premier_login',
    });

    return {
      premiereConnexion: true,
      tokens: { accessToken: tempAccessToken, refreshToken: '' },
      message: 'OTP validé. Veuillez définir votre mot de passe.',
    };
  }

  // ── Cas 2 : Connexion normale avec mot de passe ───────────────────────
  if (!motDePasse) throw new Error('MOT_DE_PASSE_REQUIS');
  if (!user.motDePasseHash) throw new Error('MOT_DE_PASSE_NON_DEFINI');

  const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasseHash);
  if (!motDePasseValide) {
    await handleEchecConnexion(user.id, user.tentativesEchouees ?? 0);
    throw new Error('MOT_DE_PASSE_INVALIDE');
  }

  await resetTentatives(user.id);
  await logAudit({ userId: user.id, action: 'CONNEXION', module: 'M10', ip });

  return {
    premiereConnexion: false,
    tokens: buildTokens(user),
    user: buildUserPublic(user),
    message: 'Connexion réussie.',
  };
}

// ── SERVICE : Définir le mot de passe (première connexion) ───────────────
export async function setPassword(params: {
  userId: number;
  motDePasse: string;
  confirmation: string;
  ip?: string;
}): Promise<{ tokens: AuthTokens; user: UserPublic }> {
  const { userId, motDePasse, confirmation, ip } = params;

  if (motDePasse !== confirmation) throw new Error('MOTS_DE_PASSE_DIFFERENTS');
  if (motDePasse.length < 8) throw new Error('MOT_DE_PASSE_TROP_COURT');

  const hash = await bcrypt.hash(motDePasse, SALT_ROUNDS);

  const [user] = await db
    .update(users)
    .set({
      motDePasseHash: hash,
      premiereConnexion: false,
      otpHash: null,
      otpExpiresAt: null,
    })
    .where(eq(users.id, userId))
    .returning();

  await logAudit({ userId: user.id, action: 'MOT_DE_PASSE_DEFINI', module: 'M10', ip });

  return {
    tokens: buildTokens(user),
    user: buildUserPublic(user),
  };
}

// ── SERVICE : Rafraîchir le token ─────────────────────────────────────────
export async function refreshToken(token: string): Promise<{ accessToken: string }> {
  const payload = verifyRefreshToken(token);

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
  if (!user || !user.actif) throw new Error('COMPTE_INACTIF');

  const accessToken = signAccessToken({
    userId: user.id,
    matricule: user.matricule,
    role: user.role,
  });

  return { accessToken };
}

// ── SERVICE : Générer et envoyer un OTP ───────────────────────────────────
export async function genererEtEnvoyerOTP(userId: number): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('UTILISATEUR_INTROUVABLE');
  if (!user.email) throw new Error('EMAIL_MANQUANT');

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const minutesExpiration = await getValeurEntier('otp_expiration_minutes', 10);
  const expiresAt = otpExpiresAt(minutesExpiration);

  await db.update(users).set({ otpHash, otpExpiresAt: expiresAt }).where(eq(users.id, userId));

  await sendOTPEmail({
    to: user.email,
    nom: user.nom,
    prenom: user.prenom,
    matricule: user.matricule,
    otp,
  });

  await logAudit({ userId: user.id, action: 'OTP_GENERE', module: 'M10' });
}
