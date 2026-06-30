import cron from 'node-cron';
import { getAccordsExpirantDans } from '@/modules/accords/services/accords.service.js';
import { sendAccordEcheanceEmail } from '../utils/email.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';

// ── Envoyer les alertes échéances accords ─────────────────────────────────
async function envoyerAlertesAccords(jours: number): Promise<void> {
  const accordsExpirants = await getAccordsExpirantDans(jours);

  if (accordsExpirants.length === 0) return;

  // Récupérer tous les admins pour les notifier
  const admins = await db.select().from(users).where(eq(users.actif, true));

  const destinataires = admins.filter((u) => ['admin', 'super_admin'].includes(u.role));

  for (const accord of accordsExpirants) {
    if (!accord.dateExpiration) continue;

    for (const admin of destinataires) {
      if (!admin.email) continue;

      try {
        await sendAccordEcheanceEmail({
          to: admin.email,
          nomAccord: accord.titre,
          reference: accord.reference,
          dateExpiration: accord.dateExpiration,
          joursRestants: jours,
        });
      } catch (error) {
        console.error(
          `[alertes] Échec envoi email accord ${accord.reference} à ${admin.email}:`,
          error
        );
      }
    }

    await logAudit({
      action: `ALERTE_ECHEANCE_${jours}J`,
      module: 'M1',
      entiteId: accord.id,
      details: { reference: accord.reference, jours },
    });
  }

  console.log(`📧 Alertes ${jours}j envoyées pour ${accordsExpirants.length} accord(s)`);
}

// ── Cron : tous les jours à 08h00 ────────────────────────────────────────
export function demarrerJobsAlertes(): void {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Vérification échéances accords...');

    // Seuil principal lu depuis la table parametres — fallback 90j si absent
    // Les paliers intermédiaires restent calculés en proportion du seuil configuré
    const seuilPrincipal = await getValeurEntier('accord_alerte_jours', 90);

    // Génère les 3 paliers : 1/3, 2/3, et seuil complet du paramètre configuré
    // ex: seuil=90 → 30, 60, 90 (comportement identique à l'historique par défaut)
    const palier1 = Math.round(seuilPrincipal / 3);
    const palier2 = Math.round((seuilPrincipal / 3) * 2);

    await envoyerAlertesAccords(palier1);
    await envoyerAlertesAccords(palier2);
    await envoyerAlertesAccords(seuilPrincipal);
  });

  console.log('📅 Alertes échéances planifiées à 08h00 quotidiennement (seuils dynamiques)');
}
