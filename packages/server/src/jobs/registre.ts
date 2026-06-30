import { mettreAJourAccordsExpires, envoyerAlertesAccords } from './alertes.js';
import { declencherSauvegardeManuelle, effectuerSauvegarde, BACKUP_NAS_DIR } from './backup.js';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';
import { db } from '@/db/index.js';
import { courriers, recommandations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';

export interface JobDefinition {
  cle: string;
  label: string;
  description: string;
  module: string;
  roleMinimum: 'admin' | 'super_admin';
  executer: () => Promise<{ resume: string; details?: Record<string, unknown> }>;
}

export const REGISTRE_JOBS: JobDefinition[] = [
  {
    cle: 'accords_expiration',
    label: 'Mise à jour statuts accords expirés',
    description:
      'Repasse en statut "expire" tous les accords actifs dont la date d\'expiration est dépassée.',
    module: 'M1',
    roleMinimum: 'admin',
    executer: async () => {
      const resultat = await mettreAJourAccordsExpires();
      return {
        resume:
          resultat.nombreMisAJour > 0
            ? `${resultat.nombreMisAJour} accord(s) repassé(s) en "expire" : ${resultat.references.join(', ')}`
            : 'Aucun accord à mettre à jour — tout est déjà cohérent.',
        details: resultat,
      };
    },
  },
  {
    cle: 'accords_alertes',
    label: 'Alertes échéances accords',
    description:
      "Envoie les emails d'alerte aux admins/CCIT pour les accords approchant de leur échéance (seuils configurés).",
    module: 'M1',
    roleMinimum: 'admin',
    executer: async () => {
      const seuilPrincipal = await getValeurEntier('accord_alerte_jours', 90);
      const palier1 = Math.round(seuilPrincipal / 3);
      const palier2 = Math.round((seuilPrincipal / 3) * 2);

      const r1 = await envoyerAlertesAccords(palier1);
      const r2 = await envoyerAlertesAccords(palier2);
      const r3 = await envoyerAlertesAccords(seuilPrincipal);

      const totalAccords = r1.accordsNotifies + r2.accordsNotifies + r3.accordsNotifies;
      const totalEmails = r1.emailsEnvoyes + r2.emailsEnvoyes + r3.emailsEnvoyes;

      return {
        resume:
          totalAccords > 0
            ? `${totalAccords} accord(s) notifié(s), ${totalEmails} email(s) envoyé(s).`
            : `Aucun accord dans les seuils configurés (${palier1}j, ${palier2}j, ${seuilPrincipal}j).`,
        details: { palier1: r1, palier2: r2, palierPrincipal: r3 },
      };
    },
  },
  {
    cle: 'courriers_criticite',
    label: 'Vérification criticité courriers',
    description:
      'Recalcule la criticité de tous les courriers en attente et signale ceux passés en seuil critique au dashboard.',
    module: 'M4',
    roleMinimum: 'admin',
    executer: async () => {
      const seuilSurveiller = await getValeurEntier('courrier_alerte_jours', 60);
      const seuilCritique = await getValeurEntier('courrier_alerte_critique_jours', 90);
      const maintenant = new Date();

      const courriersEnAttente = await db
        .select({
          id: courriers.id,
          reference: courriers.reference,
          dateReception: courriers.dateReception,
        })
        .from(courriers)
        .where(
          and(
            eq(courriers.direction, 'entrant'),
            eq(courriers.reponseRequise, 'oui'),
            eq(courriers.suiviStatut, 'en_attente')
          )
        );

      let critiques = 0;
      let aSurveiller = 0;

      for (const c of courriersEnAttente) {
        const jours = Math.floor(
          (maintenant.getTime() - new Date(c.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (jours >= seuilCritique) critiques++;
        else if (jours >= seuilSurveiller) aSurveiller++;
      }

      await logAudit({
        action: 'COURRIERS_CRITICITE_VERIFIEE',
        module: 'M4',
        details: { total: courriersEnAttente.length, critiques, aSurveiller },
      });

      return {
        resume: `${courriersEnAttente.length} courrier(s) en attente — ${critiques} critique(s), ${aSurveiller} à surveiller.`,
        details: { total: courriersEnAttente.length, critiques, aSurveiller },
      };
    },
  },
  {
    cle: 'recommandations_retard',
    label: 'Vérification recommandations en retard',
    description:
      'Identifie les recommandations dont la date limite est dépassée sans être marquées réalisées.',
    module: 'M3',
    roleMinimum: 'admin',
    executer: async () => {
      const maintenant = new Date();

      const recsEnAttente = await db
        .select({
          id: recommandations.id,
          texte: recommandations.texte,
          dateLimite: recommandations.dateLimite,
        })
        .from(recommandations)
        .where(eq(recommandations.statut, 'en_attente'));

      const depassees = recsEnAttente.filter(
        (r) => r.dateLimite && new Date(r.dateLimite) < maintenant
      );

      await logAudit({
        action: 'RECOMMANDATIONS_RETARD_VERIFIEES',
        module: 'M3',
        details: { total: recsEnAttente.length, depassees: depassees.length },
      });

      return {
        resume:
          depassees.length > 0
            ? `${depassees.length} recommandation(s) en retard sur ${recsEnAttente.length} en attente.`
            : `Aucune recommandation en retard sur ${recsEnAttente.length} en attente.`,
        details: { total: recsEnAttente.length, depassees: depassees.length },
      };
    },
  },
  {
    cle: 'backup_bdd',
    label: 'Sauvegarde locale immédiate',
    description:
      'Déclenche une sauvegarde manuelle immédiate de la base PostgreSQL en local (en plus du cron quotidien 02h00).',
    module: 'M10',
    roleMinimum: 'super_admin',
    executer: async () => {
      const resultat = await declencherSauvegardeManuelle();
      if (!resultat.succes) throw new Error(resultat.erreur ?? 'Échec de la sauvegarde.');
      return {
        resume: `Sauvegarde créée : ${resultat.nomFichier} (${resultat.tailleMo} Mo).`,
        details: resultat,
      };
    },
  },
  {
    cle: 'backup_nas',
    label: 'Sauvegarde NAS immédiate',
    description:
      'Déclenche une sauvegarde manuelle vers le NAS (en plus du cron hebdomadaire dimanche 03h00).',
    module: 'M10',
    roleMinimum: 'super_admin',
    executer: async () => {
      const resultat = await effectuerSauvegarde(BACKUP_NAS_DIR, 'hebdomadaire');
      if (!resultat.succes) throw new Error(resultat.erreur ?? 'Échec de la sauvegarde NAS.');
      return {
        resume: `Sauvegarde NAS créée : ${resultat.nomFichier} (${resultat.tailleMo} Mo).`,
        details: resultat,
      };
    },
  },
  // ── Réservé Sprint 5/9 — rapport mensuel automatique ──────────────────
  // {
  //   cle: 'rapport_mensuel', roleMinimum: 'admin', module: 'M9', ...
  // },
];

export function getJobParCle(cle: string): JobDefinition | undefined {
  return REGISTRE_JOBS.find((j) => j.cle === cle);
}
