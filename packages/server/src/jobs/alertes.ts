import cron from 'node-cron';
import { getAccordsExpirantDans } from '@/modules/accords/services/accords.service.js';
import { sendAccordEcheanceEmail } from '../utils/email.js';
import { db } from '../db/index.js';
import { accords, users } from '../db/schema.js';
import { and, eq, lte } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';

// ── Envoyer les alertes échéances accords ─────────────────────────────────
export async function envoyerAlertesAccords(jours: number): Promise<{
  accordsNotifies: number;
  emailsEnvoyes: number;
  emailsEchecs: number;
}> {
  const accordsExpirants = await getAccordsExpirantDans(jours);

  if (accordsExpirants.length === 0) {
    return { accordsNotifies: 0, emailsEnvoyes: 0, emailsEchecs: 0 };
  }

  const admins = await db.select().from(users).where(eq(users.actif, true));
  const destinataires = admins.filter((u) => ['admin', 'super_admin'].includes(u.role));

  let emailsEnvoyes = 0;
  let emailsEchecs = 0;

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
        emailsEnvoyes++;
      } catch (error) {
        emailsEchecs++;
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

  return {
    accordsNotifies: accordsExpirants.length,
    emailsEnvoyes,
    emailsEchecs,
  };
}

// ── Repasser les accords expirés en statut "expire" ───────────────────────
export async function mettreAJourAccordsExpires(): Promise<{
  nombreMisAJour: number;
  references: string[];
}> {
  const maintenant = new Date();

  const accordsAExpirer = await db
    .select({ id: accords.id, reference: accords.reference })
    .from(accords)
    .where(and(eq(accords.statut, 'actif'), lte(accords.dateExpiration, maintenant)));

  if (accordsAExpirer.length === 0) {
    return { nombreMisAJour: 0, references: [] };
  }

  for (const accord of accordsAExpirer) {
    await db
      .update(accords)
      .set({ statut: 'expire', updatedAt: new Date() })
      .where(eq(accords.id, accord.id));

    await logAudit({
      action: 'ACCORD_EXPIRE_AUTO',
      module: 'M1',
      entiteId: accord.id,
      details: { reference: accord.reference },
    });
  }

  console.log(`⚠️ ${accordsAExpirer.length} accord(s) repassé(s) en statut "expire"`);

  return {
    nombreMisAJour: accordsAExpirer.length,
    references: accordsAExpirer.map((a) => a.reference),
  };
}

// ── Cron : tous les jours à 08h00 ────────────────────────────────────────
export function demarrerJobsAlertes(): void {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Vérification échéances accords...');

    await mettreAJourAccordsExpires();

    const seuilPrincipal = await getValeurEntier('accord_alerte_jours', 90);
    const palier1 = Math.round(seuilPrincipal / 3);
    const palier2 = Math.round((seuilPrincipal / 3) * 2);

    await envoyerAlertesAccords(palier1);
    await envoyerAlertesAccords(palier2);
    await envoyerAlertesAccords(seuilPrincipal);
  });

  console.log('📅 Alertes échéances planifiées à 08h00 quotidiennement (seuils dynamiques)');
}
