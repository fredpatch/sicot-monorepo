import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, ilike, or, desc } from 'drizzle-orm';
import { UserRole } from '@sicot/shared';
import { generateOTP, hashOTP, otpExpiresAt } from '@/utils/otp';
import { sendOTPEmail } from '@/utils/email';
import { logAudit } from '@/modules/auth/services/auth.service';

// ── Types ─────────────────────────────────────────────────────────────────
export interface CreateUserParams {
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  createdByUserId: number;
}

export interface UpdateUserParams {
  role?: UserRole;
  actif?: boolean;
  updatedByUserId: number;
}

export interface UserFilters {
  search?: string; // recherche sur matricule, nom, prénom
  role?: UserRole;
  actif?: boolean;
  page?: number;
  pageSize?: number;
}

// ── Vue publique d'un utilisateur ─────────────────────────────────────────
// On n'expose jamais motDePasseHash, otpHash, etc.
export interface UserView {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  actif: boolean;
  premiereConnexion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toUserView(user: typeof users.$inferSelect): UserView {
  return {
    id: user.id,
    matricule: user.matricule,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    actif: user.actif,
    premiereConnexion: user.premiereConnexion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

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

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    data: allUsers.map(toUserView),
    total: allUsers.length,
  };
}

// ── SERVICE : Récupérer un utilisateur par ID ─────────────────────────────
export async function getUtilisateur(id: number): Promise<UserView> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new Error('UTILISATEUR_INTROUVABLE');
  return toUserView(user);
}

// ── SERVICE : Créer un utilisateur et envoyer son OTP ────────────────────
export async function creerUtilisateur(params: CreateUserParams): Promise<UserView> {
  // Vérifier si le matricule existe déjà
  const [existant] = await db.select().from(users).where(eq(users.matricule, params.matricule));

  if (existant) throw new Error('MATRICULE_EXISTANT');

  // Générer l'OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = otpExpiresAt();

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
  await sendOTPEmail({
    to: newUser.email,
    nom: newUser.nom,
    prenom: newUser.prenom,
    matricule: newUser.matricule,
    otp,
  });

  await logAudit({
    userId: params.createdByUserId,
    action: 'UTILISATEUR_CREE',
    module: 'M10',
    entiteId: newUser.id,
    details: { matricule: newUser.matricule, role: newUser.role },
  });

  return toUserView(newUser);
}

// ── SERVICE : Mettre à jour un utilisateur ────────────────────────────────
export async function mettreAJourUtilisateur(
  id: number,
  params: UpdateUserParams
): Promise<UserView> {
  const [existant] = await db.select().from(users).where(eq(users.id, id));
  if (!existant) throw new Error('UTILISATEUR_INTROUVABLE');

  const updates: Partial<typeof users.$inferInsert> = {};
  if (params.role !== undefined) updates.role = params.role;
  if (params.actif !== undefined) updates.actif = params.actif;

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
export async function reinitialiserOTP(id: number, adminId: number): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new Error('UTILISATEUR_INTROUVABLE');
  if (!user.actif) throw new Error('COMPTE_INACTIF');

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiresAt = otpExpiresAt();

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

  await sendOTPEmail({
    to: user.email,
    nom: user.nom,
    prenom: user.prenom,
    matricule: user.matricule,
    otp,
  });

  await logAudit({
    userId: adminId,
    action: 'OTP_REINITIALISE',
    module: 'M10',
    entiteId: id,
  });
}
