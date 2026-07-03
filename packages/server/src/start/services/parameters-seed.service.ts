import { db } from '@/db/index.js';
import { parametres } from '@/db/schema';

const DEFAUTS = [
  {
    cle: 'deepl_fallback_actif',
    valeur: 'false',
    type: 'booleen' as const,
    module: 'M6',
    description:
      'Autoriser le fallback DeepL si LibreTranslate échoue - nécessite DEEPL_API_KEY configuré sur le microservice',
  },
  {
    cle: 'otp_expiration_minutes',
    valeur: '10',
    type: 'entier' as const,
    module: 'M10',
    description: 'Durée de validité du code OTP envoyé par email (minutes)',
  },
  {
    cle: 'lockout_max_tentatives',
    valeur: '5',
    type: 'entier' as const,
    module: 'M10',
    description: 'Nombre de tentatives de connexion échouées avant blocage du compte',
  },
  {
    cle: 'lockout_duree_minutes',
    valeur: '30',
    type: 'entier' as const,
    module: 'M10',
    description: 'Durée du blocage du compte après dépassement du seuil de tentatives (minutes)',
  },
  {
    cle: 'backup_retention_locale_jours',
    valeur: '30',
    type: 'entier' as const,
    module: 'M10',
    description: 'Durée de conservation des sauvegardes locales quotidiennes (jours)',
  },
  {
    cle: 'backup_retention_nas_jours',
    valeur: '360',
    type: 'entier' as const,
    module: 'M10',
    description: 'Durée de conservation des sauvegardes NAS hebdomadaires (jours)',
  },
] satisfies (typeof parametres.$inferInsert)[];

// ── Seed idempotent des paramètres par défaut ─────────────────────────────
// Appelé au démarrage - n'écrase jamais une valeur déjà modifiée par un admin
export async function seedParametresDefaut(): Promise<void> {
  for (const p of DEFAUTS) {
    await db.insert(parametres).values(p).onConflictDoNothing({ target: parametres.cle });
  }
}
