import bcrypt from 'bcryptjs';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';

const SALT_ROUNDS = 10;

// ── Vérifier si le système est initialisé ─────────────────────────────────
// Le système est considéré initialisé si au moins un super_admin existe
export async function estInitialise(): Promise<boolean> {
  const [result] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.role, 'super_admin'));

  return (result?.total ?? 0) > 0;
}

// ── Créer le premier Super Admin ──────────────────────────────────────────
export async function initialiserSuperAdmin(params: {
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
}): Promise<void> {
  const { matricule, nom, prenom, email, motDePasse } = params;

  // Vérification de sécurité — ne pas écraser un système déjà initialisé
  const dejaInitialise = await estInitialise();
  if (dejaInitialise) {
    throw new Error('SYSTEME_DEJA_INITIALISE');
  }

  // Vérifier que le matricule n'existe pas déjà
  const [existant] = await db.select().from(users).where(eq(users.matricule, matricule));

  if (existant) {
    throw new Error('MATRICULE_EXISTANT');
  }

  const motDePasseHash = await bcrypt.hash(motDePasse, SALT_ROUNDS);

  const [superAdmin] = await db
    .insert(users)
    .values({
      matricule,
      nom,
      prenom,
      email,
      motDePasseHash,
      role: 'super_admin',
      actif: true,
      premiereConnexion: false, // connexion directe sans OTP
    })
    .returning();

  await logAudit({
    userId: superAdmin.id,
    action: 'BOOTSTRAP_SUPER_ADMIN_CREE',
    module: 'M10',
    details: { matricule, email },
  });
}
