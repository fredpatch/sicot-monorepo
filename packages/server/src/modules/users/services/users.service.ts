import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, ilike, or, desc, and } from 'drizzle-orm';
import { generateOTP, hashOTP, otpExpiresAt } from '@/utils/otp';
import { sendOTPEmail } from '@/utils/email';
import { logAudit } from '@/modules/auth/services/auth.service';
import { toUserView } from './users.helpers';
import type { CreateUserParams, UpdateUserParams, UserFilters, UserView } from './users.types';

export type { CreateUserParams, UpdateUserParams, UserFilters, UserView } from './users.types';

// ── SERVICE : Lister les utilisateurs ────────────────────────────────────
export async function listerUtilisateurs(filters: UserFilters): Promise<{
  data: UserView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // Construction des conditions de filtre
  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(users.matricule, `%${filters.search}%`),
        ilike(users.nom, `%${filters.search}%`),
        ilike(users.prenom, `%${filters.search}%`)
      )
    );
  }

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.actif !== undefined) {
    conditions.push(eq(users.actif, filters.actif));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const allUsers = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

    const total =  await db.$count(users, where)

  return {
    data: allUsers.map(toUserView),
    total
  };
}

// ── SERVICE : Récupérer un utilisateur par ID ─────────────────────────────
export async function getUtilisateur(id: number): Promise<UserView> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new Error('UTILISATEUR_INTROUVABLE');
  return toUserView(user);
}

// ── SERVICE : Créer un utilisateur et envoyer son OTP ────────────────────
export async function creerUtilisateur(params: CreateUserParams): Promise<{user:UserView, emailEnvoye: boolean}> {
  // Vérifier si le matricule existe déjà
  const [existant] = await db.select().from(users).where(eq(users.matricule, params.matricule));

  if (existant) throw new Error('MATRICULE_EXISTANT');

  // Générer l'OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = otpExpiresAt(15); // OTP valable 15 minutes

  // Créer l'utilisateur
 const [newUser] = await db
    .insert(users)
    .values({
      matricule: params.matricule,
      nom: params.nom,
      prenom: params.prenom,
      email: params.email,
      role: params.role,
      actif: true,
      premiereConnexion: true,
      otpHash,
      otpExpiresAt: expiresAt,
    })
    .returning();

 // Envoyer l'OTP par email
  let emailEnvoye = true;
  try {
    await sendOTPEmail({
      to: newUser.email,
      nom: newUser.nom,
      prenom: newUser.prenom,
      matricule: newUser.matricule,
      otp,
    });
  } catch (error) {
      emailEnvoye = false;
    console.error('[email] Échec envoi OTP (création utilisateur):', error);
 
  }

  await logAudit({
    userId: params.createdByUserId,
    action: 'UTILISATEUR_CREE',
    module: 'M10',
    entiteId: newUser.id,
    details: { matricule: newUser.matricule, role: newUser.role },
  });

  return { user: toUserView(newUser), emailEnvoye };
}

// ── SERVICE : Mettre à jour un utilisateur ────────────────────────────────
export async function mettreAJourUtilisateur(
  id: number,
  params: UpdateUserParams
): Promise<UserView> {
  const [existant] = await db.select().from(users).where(eq(users.id, id));
  if (!existant) throw new Error('UTILISATEUR_INTROUVABLE');

  if (params.email !== undefined && params.email !== existant.email) {
    const [emailPris] = await db.select().from(users).where(eq(users.email, params.email));
    if (emailPris) throw new Error('EMAIL_EXISTANT');
  }

 const updates: Partial<typeof users.$inferInsert> = {};
  if (params.role !== undefined) updates.role = params.role;
  if (params.actif !== undefined) updates.actif = params.actif;
  if (params.email !== undefined) updates.email = params.email;


  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  await logAudit({
    userId: params.updatedByUserId,
    action: 'UTILISATEUR_MODIFIE',
    module: 'M10',
    entiteId: id,
    details: updates,
  });

  return toUserView(updated);
}

// ── SERVICE : Activer / Désactiver un compte ──────────────────────────────
export async function toggleActivation(
  id: number,
  actif: boolean,
  adminId: number
): Promise<UserView> {
  const [existant] = await db.select().from(users).where(eq(users.id, id));
  if (!existant) throw new Error('UTILISATEUR_INTROUVABLE');

  // On ne peut pas désactiver le Super Admin
  if (existant.role === 'super_admin' && !actif) {
    throw new Error('SUPER_ADMIN_INDESACTIVABLE');
  }

  const [updated] = await db
    .update(users)
    .set({ actif, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  await logAudit({
    userId: adminId,
    action: actif ? 'UTILISATEUR_ACTIVE' : 'UTILISATEUR_DESACTIVE',
    module: 'M10',
    entiteId: id,
  });

  return toUserView(updated);
}

// ── SERVICE : Réinitialiser l'OTP d'un utilisateur ───────────────────────
export async function reinitialiserOTP(id: number, adminId: number): Promise<{emailEnvoye: boolean}> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new Error('UTILISATEUR_INTROUVABLE');
  if (!user.actif) throw new Error('COMPTE_INACTIF');

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = otpExpiresAt(15); // OTP valable 15 minutes

  await db
    .update(users)
    .set({
      otpHash,
      otpExpiresAt: expiresAt,
      premiereConnexion: true,
      motDePasseHash: null,
      tentativesEchouees: 0,
      bloqueJusquA: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

 let emailEnvoye = true;
  try {
    await sendOTPEmail({
      to: user.email,
      nom: user.nom,
      prenom: user.prenom,
      matricule: user.matricule,
      otp,
    });
  } catch (error) {
    emailEnvoye = false;
    console.error('[email] Échec envoi OTP (réinitialisation):', error);
  }

  await logAudit({
    userId: adminId,
    action: 'OTP_REINITIALISE',
    module: 'M10',
    entiteId: id,
  });

  return { emailEnvoye };
}
