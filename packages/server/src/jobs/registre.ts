import { mettreAJourAccordsExpires, envoyerAlertesAccords } from './alertes.js';
import {
  effectuerSauvegardeTier,
  promouvoirPalier,
  resumerResultat,
  synchroniserVersNas,
  compterPurges,
} from './backup.js';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';
import { db } from '@/db/index.js';
import { courriers, recommandations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { snapshotCriticiteCourriers } from './criticite-snapshot.js';
import { genererRapportMensuel } from './rapport-mensuel.js';
import type { Capability } from '@sicot/shared';

export interface JobDefinition {
  cle: string;
  label: string;
  description: string;
  module: string;
  // Capacité requise pour exécuter ce job manuellement — JOB_EXECUTE pour
  // les jobs ordinaires (admin+), SYSTEM_ADMIN_OPERATION pour les jobs à
  // haut risque (sauvegardes/système, super_admin only). Remplace l'ancien
  // champ roleMinimum ('admin' | 'super_admin') — plus de terminologie de
  // rôle dans le contrat du registre (Phase 4.8.3 cleanup).
  executionCapability: Capability;
  executer: () => Promise<{ resume: string; details?: Record<string, unknown> }>;
}

export const REGISTRE_JOBS: JobDefinition[] = [
  {
    cle: 'accords_expiration',
    label: 'Mise à jour statuts accords expirés',
    description:
      'Repasse en statut "expire" tous les accords actifs dont la date d\'expiration est dépassée.',
    module: 'M1',
    executionCapability: 'JOB_EXECUTE',
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
    executionCapability: 'JOB_EXECUTE',
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
    executionCapability: 'JOB_EXECUTE',
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
    executionCapability: 'JOB_EXECUTE',
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
    cle: 'backup_quotidien',
    label: 'Sauvegarde quotidienne immédiate',
    description:
      "Déclenche immédiatement la sauvegarde du palier quotidien, vers le dossier local et le NAS indépendamment (en plus du cycle automatique de minuit).",
    module: 'M10',
    executionCapability: 'SYSTEM_ADMIN_OPERATION',
    executer: async () => {
      const resultat = await effectuerSauvegardeTier('quotidien');
      if (!resultat.succesGlobal) throw new Error(resumerResultat(resultat));
      return { resume: resumerResultat(resultat), details: { ...resultat } };
    },
  },
  {
    cle: 'backup_hebdomadaire',
    label: 'Promotion hebdomadaire',
    description:
      'Crée la sauvegarde hebdomadaire du jour puis purge les sauvegardes quotidiennes au-delà du nombre configuré à conserver (seulement si la promotion a réussi).',
    module: 'M10',
    executionCapability: 'SYSTEM_ADMIN_OPERATION',
    executer: async () => {
      const { resultat, supprimesLocal, supprimesNas } = await promouvoirPalier(
        'hebdomadaire',
        'quotidien',
        'backup_retention_quotidien_nombre',
        7
      );
      if (!resultat.succesGlobal) throw new Error(resumerResultat(resultat));
      return {
        resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} sauvegarde(s) quotidienne(s) purgée(s).`,
        details: { resultat, supprimesLocal, supprimesNas },
      };
    },
  },
  {
    cle: 'backup_mensuel',
    label: 'Promotion mensuelle',
    description:
      'Crée la sauvegarde mensuelle du jour puis purge les sauvegardes hebdomadaires au-delà du nombre configuré à conserver (seulement si la promotion a réussi).',
    module: 'M10',
    executionCapability: 'SYSTEM_ADMIN_OPERATION',
    executer: async () => {
      const { resultat, supprimesLocal, supprimesNas } = await promouvoirPalier(
        'mensuel',
        'hebdomadaire',
        'backup_retention_hebdomadaire_nombre',
        5
      );
      if (!resultat.succesGlobal) throw new Error(resumerResultat(resultat));
      return {
        resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} sauvegarde(s) hebdomadaire(s) purgée(s).`,
        details: { resultat, supprimesLocal, supprimesNas },
      };
    },
  },
  {
    cle: 'backup_annuel',
    label: 'Promotion annuelle',
    description:
      'Crée la sauvegarde annuelle du jour puis purge les sauvegardes mensuelles au-delà du nombre configuré à conserver. La sauvegarde annuelle elle-même est conservée indéfiniment.',
    module: 'M10',
    executionCapability: 'SYSTEM_ADMIN_OPERATION',
    executer: async () => {
      const { resultat, supprimesLocal, supprimesNas } = await promouvoirPalier(
        'annuel',
        'mensuel',
        'backup_retention_mensuel_nombre',
        12
      );
      if (!resultat.succesGlobal) throw new Error(resumerResultat(resultat));
      return {
        resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} sauvegarde(s) mensuelle(s) purgée(s). Conservée indéfiniment.`,
        details: { resultat, supprimesLocal, supprimesNas },
      };
    },
  },
  {
    cle: 'backup_sync_nas',
    label: 'Synchroniser vers le NAS',
    description:
      "Copie vers le NAS les sauvegardes présentes en local mais absentes du NAS — utile après une coupure réseau pendant laquelle seule la sauvegarde locale a pu s'exécuter.",
    module: 'M10',
    executionCapability: 'SYSTEM_ADMIN_OPERATION',
    executer: async () => {
      const { copies, erreurs } = await synchroniserVersNas();
      return {
        resume:
          copies.length > 0
            ? `${copies.length} sauvegarde(s) copiée(s) vers le NAS.${erreurs.length > 0 ? ` ${erreurs.length} échec(s).` : ''}`
            : 'Aucune sauvegarde à synchroniser — le NAS est déjà à jour.',
        details: { copies, erreurs },
      };
    },
  },
  {
    cle: 'courriers_criticite_snapshot',
    label: 'Capture criticité courriers (historique)',
    description:
      "Enregistre l'état du jour (normal/à surveiller/critique) pour alimenter l'évolution dans le temps en Analytics. Utile en dev pour peupler l'historique sans attendre plusieurs jours.",
    module: 'M11',
    executionCapability: 'JOB_EXECUTE',
    executer: async () => {
      const resultat = await snapshotCriticiteCourriers();
      return {
        resume: `Snapshot du ${resultat.date} : ${resultat.normal} normal, ${resultat.aSurveiller} à surveiller, ${resultat.critique} critique.`,
        details: resultat,
      };
    },
  },
  {
    cle: 'rapport_mensuel',
    label: 'Générer le rapport mensuel',
    description:
      'Génère manuellement le rapport du mois précédent (PDF + Excel), archivé dans M8. Utile en dev pour tester sans attendre le 1er du mois.',
    module: 'M11',
    executionCapability: 'JOB_EXECUTE',
    executer: async () => {
      const resultat = await genererRapportMensuel();
      return {
        resume: `Rapport mensuel généré — document PDF #${resultat.pdf}, document Excel #${resultat.excel}.`,
        details: resultat,
      };
    },
  },
  // ── Réservé Sprint 5/9 — rapport mensuel automatique ──────────────────
  // {
  //   cle: 'rapport_mensuel', executionCapability: 'JOB_EXECUTE', module: 'M9', ...
  // },
];

export function getJobParCle(cle: string): JobDefinition | undefined {
  return REGISTRE_JOBS.find((j) => j.cle === cle);
}
