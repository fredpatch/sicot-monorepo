import cron from 'node-cron';
import { getAccordsExpirantDans } from '@/modules/accords/services/accords.service.js';
import { sendAccordEcheanceEmail } from '../utils/email.js';
import { db } from '../db/index.js';
import { accords, users } from '../db/schema.js';
import { and, eq, lte } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';
import { enregistrerExecutionJob } from '@/modules/jobs/services/job-executions.service.js';

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
// Deux entrées d'historique distinctes par run — une par job du registre
// (accords_expiration / accords_alertes) — pour que le monitoring cron
// s'aligne exactement sur ce que montre la liste des jobs manuels.
export function demarrerJobsAlertes(): void {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Vérification échéances accords...');

    const debut1 = Date.now();
    try {
      const resultat = await mettreAJourAccordsExpires();
      await enregistrerExecutionJob({
        jobCle: 'accords_expiration',
        module: 'M1',
        source: 'cron',
        succes: true,
        resume:
          resultat.nombreMisAJour > 0
            ? `${resultat.nombreMisAJour} accord(s) repassé(s) en "expire" : ${resultat.references.join(', ')}`
            : 'Aucun accord à mettre à jour — tout est déjà cohérent.',
        dureeMs: Date.now() - debut1,
      });
    } catch (error) {
      await enregistrerExecutionJob({
        jobCle: 'accords_expiration',
        module: 'M1',
        source: 'cron',
        succes: false,
        resume: "Échec de l'exécution.",
        erreur: error instanceof Error ? error.message : 'Erreur inconnue',
        dureeMs: Date.now() - debut1,
      });
    }

    const debut2 = Date.now();
    try {
      const seuilPrincipal = await getValeurEntier('accord_alerte_jours', 90);
      const palier1 = Math.round(seuilPrincipal / 3);
      const palier2 = Math.round((seuilPrincipal / 3) * 2);

      const r1 = await envoyerAlertesAccords(palier1);
      const r2 = await envoyerAlertesAccords(palier2);
      const r3 = await envoyerAlertesAccords(seuilPrincipal);

      const totalAccords = r1.accordsNotifies + r2.accordsNotifies + r3.accordsNotifies;
      const totalEmails = r1.emailsEnvoyes + r2.emailsEnvoyes + r3.emailsEnvoyes;

      await enregistrerExecutionJob({
        jobCle: 'accords_alertes',
        module: 'M1',
        source: 'cron',
        succes: true,
        resume:
          totalAccords > 0
            ? `${totalAccords} accord(s) notifié(s), ${totalEmails} email(s) envoyé(s).`
            : `Aucun accord dans les seuils configurés (${palier1}j, ${palier2}j, ${seuilPrincipal}j).`,
        dureeMs: Date.now() - debut2,
      });
    } catch (error) {
      await enregistrerExecutionJob({
        jobCle: 'accords_alertes',
        module: 'M1',
        source: 'cron',
        succes: false,
        resume: "Échec de l'exécution.",
        erreur: error instanceof Error ? error.message : 'Erreur inconnue',
        dureeMs: Date.now() - debut2,
      });
    }
  });

  console.log('📅 Alertes échéances planifiées à 08h00 quotidiennement (seuils dynamiques)');
}
