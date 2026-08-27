import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logAudit } from '@/modules/auth/services/auth.service';
import { getValeurEntier, getValeurTexte } from '@/modules/parametres/services/parametres.service.js';
import { enregistrerExecutionJob } from '@/modules/jobs/services/job-executions.service.js';

const execAsync = promisify(exec);

// ── Configuration ─────────────────────────────────────────────────────────
// Rotation grand-père/père/fils : chaque palier est un pg_dump indépendant
// (un dump ne peut pas être "fusionné" en un autre), toujours écrit vers les
// deux destinations en parallèle et de façon indépendante l'une de l'autre —
// une destination injoignable ne doit jamais bloquer l'autre (ex. NAS en
// panne réseau ne doit pas empêcher la sauvegarde locale, et inversement).
export type BackupTier = 'quotidien' | 'hebdomadaire' | 'mensuel' | 'annuel';

const PG_DUMP_BIN = process.env.PG_DUMP_PATH ?? 'pg_dump';
// Dossier local — modifiable par le Super Admin (paramètre backup_local_dir,
// voir Administration > Paramètres > Sauvegardes) ; cette constante ne sert
// que de valeur de repli si le paramètre est absent en base.
const BACKUP_LOCAL_DIR_DEFAUT = process.env.BACKUP_LOCAL_DIR ?? '/sicot/backups/local';
// Dossier NAS — reste piloté par variable d'environnement (montage réseau
// géré par l'IT, pas un choix à exposer à un administrateur applicatif).
export const BACKUP_NAS_DIR = process.env.BACKUP_NAS_DIR ?? '/mnt/nas/sicot/backups';

// En dessous de ce seuil, un fichier .sql "réussi" est en réalité un dump
// tronqué/incomplet (pg_dump peut écrire un fichier vide sans lever d'erreur
// shell dans de rares cas, ex. base injoignable au moment exact de l'appel).
const TAILLE_MIN_OCTETS = 1024;

async function getRacineLocale(): Promise<string> {
  return getValeurTexte('backup_local_dir', BACKUP_LOCAL_DIR_DEFAUT);
}

// ── Utilitaires ───────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function dossierTier(racine: string, tier: BackupTier): string {
  return path.join(racine, tier);
}

// ── Purge d'un palier — ne conserve que les N plus récents, par destination.
// Jamais appelée avant qu'un nouveau dump du palier supérieur ait réussi (au
// moins une destination) — voir executerCycleSauvegarde().
export function prunerPalier(racine: string, tier: BackupTier, nombreAConserver: number): string[] {
  const dir = dossierTier(racine, tier);
  if (!fs.existsSync(dir)) return [];

  const prefix = `sicot_backup_${tier}_`;
  const fichiers = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const aSupprimer = fichiers.slice(nombreAConserver);
  aSupprimer.forEach(({ f }) => fs.unlinkSync(path.join(dir, f)));

  return aSupprimer.map(({ f }) => f);
}

interface ResultatDestination {
  succes: boolean;
  nomFichier?: string;
  tailleMo?: number;
  erreur?: string;
}

// ── Dump vers UNE destination — n'est jamais bloquant pour l'autre, ne lève
// jamais d'exception (le résultat porte l'échec pour que l'appelant puisse
// traiter chaque destination indépendamment).
async function dumpVersDestination(destinationRoot: string, tier: BackupTier): Promise<ResultatDestination> {
  try {
    const dir = dossierTier(destinationRoot, tier);
    ensureDir(dir);

    const timestamp = formatDate(new Date());
    const filename = `sicot_backup_${tier}_${timestamp}.sql`;
    const filepath = path.join(dir, filename);

    const databaseUrl = process.env.DATABASE_URL!;
    const command = `"${PG_DUMP_BIN}" "${databaseUrl}" --no-password --format=plain --file="${filepath}"`;

    await execAsync(command);
    const stats = fs.statSync(filepath);

    if (stats.size < TAILLE_MIN_OCTETS) {
      fs.unlinkSync(filepath);
      throw new Error(`Fichier de sauvegarde anormalement petit (${stats.size} o) — dump probablement incomplet.`);
    }

    const tailleMo = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
    return { succes: true, nomFichier: filename, tailleMo };
  } catch (error) {
    const erreur = error instanceof Error ? error.message : String(error);
    return { succes: false, erreur };
  }
}

export interface ResultatSauvegardeTier {
  tier: BackupTier;
  local: ResultatDestination;
  nas: ResultatDestination;
  succesGlobal: boolean;
}

// ── Sauvegarde d'un palier vers les deux destinations, indépendamment ─────
export async function effectuerSauvegardeTier(tier: BackupTier): Promise<ResultatSauvegardeTier> {
  const racineLocale = await getRacineLocale();

  const [local, nas] = await Promise.all([
    dumpVersDestination(racineLocale, tier),
    dumpVersDestination(BACKUP_NAS_DIR, tier),
  ]);

  const succesGlobal = local.succes || nas.succes;

  if (local.succes || nas.succes) {
    console.log(
      `✅ Sauvegarde ${tier} — local: ${local.succes ? 'OK' : 'ÉCHEC'}, NAS: ${nas.succes ? 'OK' : 'ÉCHEC'}`
    );
  } else {
    console.error(`❌ Sauvegarde ${tier} échouée sur les deux destinations.`);
  }

  await logAudit({
    action: succesGlobal ? `SAUVEGARDE_${tier.toUpperCase()}` : `SAUVEGARDE_${tier.toUpperCase()}_ECHEC`,
    module: 'M10',
    details: { tier, local, nas },
  });

  return { tier, local, nas, succesGlobal };
}

export function resumerResultat(resultat: ResultatSauvegardeTier): string {
  const parties: string[] = [];
  parties.push(
    resultat.local.succes
      ? `Local : ${resultat.local.nomFichier} (${resultat.local.tailleMo} Mo)`
      : `Local : échec — ${resultat.local.erreur}`
  );
  parties.push(
    resultat.nas.succes
      ? `NAS : ${resultat.nas.nomFichier} (${resultat.nas.tailleMo} Mo)`
      : `NAS : échec — ${resultat.nas.erreur}`
  );
  return parties.join(' · ');
}

// ── Promotion d'un palier : nouveau dump du palier + purge du palier
// inférieur, UNIQUEMENT si la promotion a réussi sur au moins une
// destination (jamais de purge avant confirmation du nouveau palier).
export async function promouvoirPalier(
  tier: BackupTier,
  tierInferieur: BackupTier | null,
  clesRetention: string,
  retentionDefaut: number
): Promise<{ resultat: ResultatSauvegardeTier; supprimesLocal: string[]; supprimesNas: string[] }> {
  const resultat = await effectuerSauvegardeTier(tier);

  let supprimesLocal: string[] = [];
  let supprimesNas: string[] = [];

  if (resultat.succesGlobal && tierInferieur) {
    const nombreAConserver = await getValeurEntier(clesRetention, retentionDefaut);
    const racineLocale = await getRacineLocale();
    if (resultat.local.succes) supprimesLocal = prunerPalier(racineLocale, tierInferieur, nombreAConserver);
    if (resultat.nas.succes) supprimesNas = prunerPalier(BACKUP_NAS_DIR, tierInferieur, nombreAConserver);
  }

  return { resultat, supprimesLocal, supprimesNas };
}

// ── Nombre de sauvegardes distinctes purgées — dédoublonne par nom de
// fichier plutôt que de sommer les deux listes (le même fichier supprimé du
// local ET du NAS ne compte que pour une seule sauvegarde purgée).
export function compterPurges(supprimesLocal: string[], supprimesNas: string[]): number {
  return new Set([...supprimesLocal, ...supprimesNas]).size;
}

function estDernierJourDuMois(date: Date): boolean {
  const demain = new Date(date);
  demain.setDate(date.getDate() + 1);
  return demain.getDate() === 1;
}

function estDernierJourDeLAnnee(date: Date): boolean {
  return date.getMonth() === 11 && date.getDate() === 31;
}

// ── Cycle quotidien complet — dump du jour, puis promotion des paliers dont
// la frontière calendaire tombe aujourd'hui. Chaque palier est un pg_dump
// indépendant (jamais une "fusion" des dumps du dessous), et chaque étape
// est enregistrée séparément dans l'historique des jobs pour un monitoring
// fidèle à ce qui s'est réellement passé.
export async function executerCycleSauvegarde(): Promise<void> {
  const debut = new Date();

  const quotidien = await effectuerSauvegardeTier('quotidien');
  await enregistrerExecutionJob({
    jobCle: 'backup_quotidien',
    module: 'M10',
    source: 'cron',
    succes: quotidien.succesGlobal,
    resume: resumerResultat(quotidien),
    dureeMs: Date.now() - debut.getTime(),
  });

  if (debut.getDay() === 0) {
    const debutEtape = Date.now();
    const { resultat, supprimesLocal, supprimesNas } = await promouvoirPalier(
      'hebdomadaire',
      'quotidien',
      'backup_retention_quotidien_nombre',
      7
    );
    await enregistrerExecutionJob({
      jobCle: 'backup_hebdomadaire',
      module: 'M10',
      source: 'cron',
      succes: resultat.succesGlobal,
      resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} sauvegarde(s) quotidienne(s) purgée(s).`,
      dureeMs: Date.now() - debutEtape,
    });
  }

  if (estDernierJourDuMois(debut)) {
    const debutEtape = Date.now();
    const { resultat, supprimesLocal, supprimesNas } = await promouvoirPalier(
      'mensuel',
      'hebdomadaire',
      'backup_retention_hebdomadaire_nombre',
      5
    );
    await enregistrerExecutionJob({
      jobCle: 'backup_mensuel',
      module: 'M10',
      source: 'cron',
      succes: resultat.succesGlobal,
      resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} sauvegarde(s) hebdomadaire(s) purgée(s).`,
      dureeMs: Date.now() - debutEtape,
    });
  }

  if (estDernierJourDeLAnnee(debut)) {
    const debutEtape = Date.now();
    const { resultat, supprimesLocal, supprimesNas } = await promouvoirPalier(
      'annuel',
      'mensuel',
      'backup_retention_mensuel_nombre',
      12
    );
    await enregistrerExecutionJob({
      jobCle: 'backup_annuel',
      module: 'M10',
      source: 'cron',
      succes: resultat.succesGlobal,
      resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} sauvegarde(s) mensuelle(s) purgée(s). Sauvegarde annuelle conservée indéfiniment.`,
      dureeMs: Date.now() - debutEtape,
    });
  }
}

// ── Planification — un seul cron quotidien à minuit, la logique de palier
// est un enchaînement séquentiel interne (jamais deux pg_dump concurrents).
export function demarrerJobsSauvegarde(): void {
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Démarrage du cycle de sauvegarde quotidien...');
    await executerCycleSauvegarde();
  });

  console.log('📅 Cycle de sauvegarde planifié quotidiennement à 00h00 (rotation quotidien/hebdo/mensuel/annuel)');
}

// ── Synchronisation de rattrapage — copie vers le NAS les sauvegardes
// présentes en local mais absentes du NAS (ex. après une coupure réseau
// pendant laquelle seule la destination locale a pu être écrite). Ne
// supprime jamais rien, ne synchronise que dans le sens local → NAS (le
// disque local du serveur applicatif est la source de vérité disponible en
// permanence ; le NAS est la destination pouvant être intermittente).
export async function synchroniserVersNas(): Promise<{
  copies: string[];
  erreurs: string[];
}> {
  const racineLocale = await getRacineLocale();
  const tiers: BackupTier[] = ['quotidien', 'hebdomadaire', 'mensuel', 'annuel'];

  const copies: string[] = [];
  const erreurs: string[] = [];

  for (const tier of tiers) {
    const dirLocal = dossierTier(racineLocale, tier);
    if (!fs.existsSync(dirLocal)) continue;

    const dirNas = dossierTier(BACKUP_NAS_DIR, tier);
    ensureDir(dirNas);

    const fichiersLocaux = fs.readdirSync(dirLocal);
    const fichiersNas = new Set(fs.readdirSync(dirNas));

    for (const fichier of fichiersLocaux) {
      if (fichiersNas.has(fichier)) continue;
      try {
        fs.copyFileSync(path.join(dirLocal, fichier), path.join(dirNas, fichier));
        copies.push(`${tier}/${fichier}`);
      } catch (error) {
        erreurs.push(`${tier}/${fichier} : ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  await logAudit({
    action: 'SAUVEGARDE_SYNC_NAS',
    module: 'M10',
    details: { copies: copies.length, erreurs: erreurs.length },
  });

  return { copies, erreurs };
}
