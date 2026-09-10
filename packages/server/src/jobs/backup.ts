import cron from 'node-cron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logAudit } from '@/modules/auth/services/auth.service';
import {
  getValeurEntier,
  getValeurTexte,
} from '@/modules/parametres/services/parametres.service.js';
import { enregistrerExecutionJob } from '@/modules/jobs/services/job-executions.service.js';
import { UPLOAD_DIR } from '@/modules/document/services/documents.constants.js';

const execFileAsync = promisify(execFile);

// ── Configuration ─────────────────────────────────────────────────────────
// Phase 12.3A - un "run" de sauvegarde produit désormais un JEU complet
// (database.sql + documents.tar.gz + manifest.json) dans un dossier unique
// et horodaté, pas un fichier .sql isolé. Le jeu local est la référence ;
// le NAS n'est qu'une réplication de ce jeu déjà validé (jamais un second
// pg_dump indépendant). Rotation grand-père/père/fils inchangée, mais
// l'unité de rétention est le dossier de jeu, jamais un artefact isolé.
export type BackupTier = 'quotidien' | 'hebdomadaire' | 'mensuel' | 'annuel';

const MANIFEST_FORMAT_VERSION = 1;
const PG_DUMP_BIN = process.env.PG_DUMP_PATH ?? 'pg_dump';
const TAR_BIN = process.env.TAR_PATH ?? 'tar';

// Dossier local - modifiable par le Super Admin (paramètre backup_local_dir,
// voir Administration > Paramètres > Sauvegardes) ; cette constante ne sert
// que de valeur de repli si le paramètre est absent en base.
const BACKUP_LOCAL_DIR_DEFAUT = process.env.BACKUP_LOCAL_DIR ?? '/sicot/backups/local';
// Dossier NAS - piloté par variable d'environnement uniquement (montage
// réseau géré par l'IT). Résolu à chaque appel (pas mis en cache) : la
// garde nasDestinationUtilisable() doit refléter l'état RÉEL de
// l'environnement, et on ne crée JAMAIS la racine NAS nous-mêmes - un
// dossier auto-créé à ce chemin ne prouverait rien quant au montage réel.
// Défaut inchangé (chemin de montage attendu) : si BACKUP_NAS_DIR n'est pas
// défini et que ce chemin n'existe pas dans le conteneur, la réplication
// est simplement signalée "indisponible" (jamais un dossier fantôme créé).
const BACKUP_NAS_DIR_DEFAUT = '/mnt/nas/sicot/backups';

function resoudreRacineNas(): string {
  return process.env.BACKUP_NAS_DIR ?? BACKUP_NAS_DIR_DEFAUT;
}

// En dessous de ce seuil, un fichier .sql "réussi" est en réalité un dump
// tronqué/incomplet (pg_dump peut écrire un fichier vide sans lever d'erreur
// dans de rares cas, ex. base injoignable au moment exact de l'appel).
const TAILLE_MIN_DUMP_OCTETS = 1024;

const NOM_DUMP = 'database.sql';
const NOM_ARCHIVE = 'documents.tar.gz';
const NOM_MANIFEST = 'manifest.json';
const SUFFIXE_EN_COURS = '.inprogress';

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

function idJeu(tier: BackupTier, date: Date): string {
  // Suffixe aléatoire court : garantit l'unicité même si deux runs du même
  // palier démarrent dans la même seconde (le préfixe horodaté reste
  // dominant pour le tri).
  const suffixe = crypto.randomBytes(3).toString('hex');
  return `backup-${tier}-${formatDate(date)}-${suffixe}`;
}

// SHA-256 en flux (crypto natif) - aucune dépendance, aucun shell, testable
// simplement sur un fichier temporaire.
function calculerSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// ── Verrou d'exécution (in-process uniquement) ────────────────────────────
// Empêche deux sauvegardes de se chevaucher dans le même process Node
// (cron + déclenchement manuel, ou deux manuels). Ne résout PAS le
// verrouillage distribué multi-instances - hors périmètre 12.3A.
let sauvegardeEnCours = false;

async function avecVerrouSauvegarde<T>(operation: () => Promise<T>): Promise<T> {
  if (sauvegardeEnCours) {
    throw new Error('SAUVEGARDE_DEJA_EN_COURS');
  }
  sauvegardeEnCours = true;
  try {
    return await operation();
  } finally {
    sauvegardeEnCours = false;
  }
}

// ── Types de résultat ─────────────────────────────────────────────────────
export interface ArtefactMeta {
  filename: string;
  sizeBytes: number;
  sha256: string;
}

export type EtapeEchecJeu = 'pg_dump' | 'archive' | 'checksum' | 'manifest' | 'finalisation';

export interface ResultatJeuLocal {
  succes: boolean;
  setId: string;
  tier: BackupTier;
  cheminFinal?: string;
  database?: ArtefactMeta;
  documents?: ArtefactMeta & { fileCount: number };
  dureeMs: number;
  etapeEchec?: EtapeEchecJeu;
  erreur?: string;
}

export type StatutReplicationNas =
  | 'ok'
  | 'echec'
  | 'non_configure'
  | 'indisponible'
  | 'ignore';

export interface ResultatReplicationNas {
  statut: StatutReplicationNas;
  chemin?: string;
  erreur?: string;
}

export interface ResultatSauvegardeTier {
  tier: BackupTier;
  local: ResultatJeuLocal;
  nas: ResultatReplicationNas;
  // Le succès du run = succès du jeu LOCAL uniquement. Une réplication NAS
  // ratée n'invalide jamais un jeu local complet et validé.
  succesGlobal: boolean;
}

// ── Création d'un jeu de sauvegarde local, atomique ───────────────────────
// Ordre imposé (cohérence, cf. prompt Phase 12.3A §3) :
//   1. dossier .inprogress
//   2. pg_dump  (la BDD est dumpée AVANT l'archive : un upload survenant
//      entre les deux ne produit au pire qu'un fichier orphelin en trop
//      dans l'archive - jamais une ligne documents sans fichier associé)
//   3. archive de UPLOAD_DIR
//   4. checksums SHA-256
//   5. manifest.json
//   6. renommage atomique .inprogress -> nom définitif
// Toute erreur avant l'étape 6 supprime le .inprogress : un jeu partiel ne
// doit jamais ressembler à une sauvegarde restaurable.
async function creerJeuSauvegarde(
  tier: BackupTier,
  racineLocale: string
): Promise<ResultatJeuLocal> {
  const debut = Date.now();
  const setId = idJeu(tier, new Date());
  const tierDir = dossierTier(racineLocale, tier);
  ensureDir(tierDir);

  const enCoursDir = path.join(tierDir, setId + SUFFIXE_EN_COURS);
  const finalDir = path.join(tierDir, setId);

  const nettoyer = () => {
    if (fs.existsSync(enCoursDir)) {
      fs.rmSync(enCoursDir, { recursive: true, force: true });
    }
  };

  const echec = (etapeEchec: EtapeEchecJeu, error: unknown): ResultatJeuLocal => {
    nettoyer();
    return {
      succes: false,
      setId,
      tier,
      dureeMs: Date.now() - debut,
      etapeEchec,
      erreur: error instanceof Error ? error.message : String(error),
    };
  };

  ensureDir(enCoursDir);

  // ── Étape 2 : pg_dump ──────────────────────────────────────────────────
  const dumpPath = path.join(enCoursDir, NOM_DUMP);
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL absent de l\'environnement.');

    // execFile + tableau d'arguments : aucune chaîne shell, donc aucun
    // risque d'injection via DATABASE_URL / chemins / noms de fichier.
    await execFileAsync(PG_DUMP_BIN, [
      databaseUrl,
      '--no-password',
      '--format=plain',
      '-f',
      dumpPath,
    ]);

    const dumpStats = fs.statSync(dumpPath);
    if (dumpStats.size < TAILLE_MIN_DUMP_OCTETS) {
      throw new Error(
        `Dump anormalement petit (${dumpStats.size} o) - probablement incomplet.`
      );
    }
  } catch (error) {
    return echec('pg_dump', error);
  }

  // ── Étape 3 : archive de UPLOAD_DIR ────────────────────────────────────
  const archivePath = path.join(enCoursDir, NOM_ARCHIVE);
  try {
    // Un UPLOAD_DIR inexistant (installation neuve, aucun document) doit
    // quand même produire une archive valide - on crée le dossier vide au
    // besoin, tar -C . produit alors une archive ne contenant que "./".
    ensureDir(UPLOAD_DIR);
    await execFileAsync(TAR_BIN, ['-czf', archivePath, '-C', UPLOAD_DIR, '.']);
    const archiveStats = fs.statSync(archivePath);
    if (archiveStats.size === 0) {
      throw new Error('Archive documents vide (0 o).');
    }
  } catch (error) {
    return echec('archive', error);
  }

  // ── Étape 4 : checksums + nombre de fichiers ───────────────────────────
  let dbMeta: ArtefactMeta;
  let docsMeta: ArtefactMeta & { fileCount: number };
  try {
    const [dbSize, dbHash, archiveSize, archiveHash] = await Promise.all([
      Promise.resolve(fs.statSync(dumpPath).size),
      calculerSha256(dumpPath),
      Promise.resolve(fs.statSync(archivePath).size),
      calculerSha256(archivePath),
    ]);

    // Nombre de fichiers réels DANS l'archive (execFile, pas de shell) -
    // les entrées de répertoire se terminent par "/".
    const { stdout } = await execFileAsync(TAR_BIN, ['-tzf', archivePath]);
    const fileCount = stdout
      .split('\n')
      .filter((ligne) => ligne.length > 0 && !ligne.endsWith('/')).length;

    dbMeta = { filename: NOM_DUMP, sizeBytes: dbSize, sha256: dbHash };
    docsMeta = {
      filename: NOM_ARCHIVE,
      sizeBytes: archiveSize,
      sha256: archiveHash,
      fileCount,
    };
  } catch (error) {
    return echec('checksum', error);
  }

  // ── Étape 5 : manifest.json (métadonnées opérationnelles UNIQUEMENT) ───
  try {
    const manifest = {
      formatVersion: MANIFEST_FORMAT_VERSION,
      backupId: setId,
      tier,
      createdAt: new Date().toISOString(),
      database: dbMeta,
      documents: docsMeta,
      // Valeur runtime stable si disponible, sinon null - on ne shell
      // jamais vers git depuis le conteneur (.git peut ne pas exister).
      applicationVersion: process.env.APP_VERSION ?? null,
    };
    fs.writeFileSync(
      path.join(enCoursDir, NOM_MANIFEST),
      JSON.stringify(manifest, null, 2)
    );

    // Validation : les trois artefacts requis doivent exister.
    for (const nom of [NOM_DUMP, NOM_ARCHIVE, NOM_MANIFEST]) {
      if (!fs.existsSync(path.join(enCoursDir, nom))) {
        throw new Error(`Artefact requis manquant après génération : ${nom}`);
      }
    }
  } catch (error) {
    return echec('manifest', error);
  }

  // ── Étape 6 : renommage atomique ──────────────────────────────────────
  try {
    fs.renameSync(enCoursDir, finalDir);
  } catch (error) {
    return echec('finalisation', error);
  }

  return {
    succes: true,
    setId,
    tier,
    cheminFinal: finalDir,
    database: dbMeta,
    documents: docsMeta,
    dureeMs: Date.now() - debut,
  };
}

// ── Garde NAS ─────────────────────────────────────────────────────────────
// Plus petite garde fiable réalisable depuis le code applicatif SANS
// connaissance du montage : on ne crée JAMAIS la racine NAS ; on exige
// qu'elle préexiste en tant que dossier. Limite connue et assumée : un
// dossier créé manuellement à ce chemin mais SANS montage réel passerait
// quand même cette garde - le distinguer demanderait de lire /proc/mounts
// et de connaître le type de fs attendu, hors périmètre 12.3A.
function nasDestinationUtilisable():
  | { utilisable: true; racine: string }
  | { utilisable: false; raison: StatutReplicationNas } {
  const racine = resoudreRacineNas().trim();
  if (racine === '') {
    return { utilisable: false, raison: 'non_configure' };
  }
  try {
    if (!fs.existsSync(racine) || !fs.statSync(racine).isDirectory()) {
      return { utilisable: false, raison: 'indisponible' };
    }
  } catch {
    return { utilisable: false, raison: 'indisponible' };
  }
  return { utilisable: true, racine };
}

// ── Réplication d'un jeu local COMPLET vers le NAS ────────────────────────
// Copie le dossier de jeu déjà validé, à l'identique. Ne relance jamais
// pg_dump ni tar. Une copie NAS ratée est une défaillance post-complétion :
// elle n'affecte pas le succès du jeu local.
async function repliquerVersNas(
  cheminLocal: string,
  tier: BackupTier,
  setId: string
): Promise<ResultatReplicationNas> {
  const garde = nasDestinationUtilisable();
  if (!garde.utilisable) {
    return { statut: garde.raison };
  }

  try {
    const nasTierDir = dossierTier(garde.racine, tier);
    ensureDir(nasTierDir); // à l'INTÉRIEUR d'une racine NAS préexistante

    const cibleFinale = path.join(nasTierDir, setId);
    if (fs.existsSync(cibleFinale)) {
      return { statut: 'ok', chemin: cibleFinale };
    }

    const cibleEnCours = path.join(nasTierDir, setId + SUFFIXE_EN_COURS);
    if (fs.existsSync(cibleEnCours)) {
      fs.rmSync(cibleEnCours, { recursive: true, force: true });
    }
    fs.cpSync(cheminLocal, cibleEnCours, { recursive: true });
    fs.renameSync(cibleEnCours, cibleFinale);

    return { statut: 'ok', chemin: cibleFinale };
  } catch (error) {
    return {
      statut: 'echec',
      erreur: error instanceof Error ? error.message : String(error),
    };
  }
}

// ── Rétention : purge de JEUX complets (jamais un artefact isolé) ─────────
// Ne conserve que les N jeux complets les plus récents d'un palier, sur une
// racine donnée. Ignore les dossiers *.inprogress (jeux en cours ou avortés).
// Jamais appelée avant qu'une promotion du palier supérieur ait réussi.
export function prunerJeux(
  racine: string,
  tier: BackupTier,
  nombreAConserver: number
): string[] {
  const dir = dossierTier(racine, tier);
  if (!fs.existsSync(dir)) return [];

  const prefix = `backup-${tier}-`;
  const jeux = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        e.name.startsWith(prefix) &&
        !e.name.endsWith(SUFFIXE_EN_COURS)
    )
    .map((e) => ({ name: e.name, mtime: fs.statSync(path.join(dir, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const aSupprimer = jeux.slice(nombreAConserver);
  aSupprimer.forEach(({ name }) => fs.rmSync(path.join(dir, name), { recursive: true, force: true }));

  return aSupprimer.map(({ name }) => name);
}

// ── Sauvegarde d'un palier : jeu local + réplication NAS ─────────────────
export async function effectuerSauvegardeTier(
  tier: BackupTier
): Promise<ResultatSauvegardeTier> {
  return avecVerrouSauvegarde(async () => {
    const racineLocale = await getRacineLocale();
    const local = await creerJeuSauvegarde(tier, racineLocale);

    const nas: ResultatReplicationNas = local.succes
      ? await repliquerVersNas(local.cheminFinal!, tier, local.setId)
      : { statut: 'ignore' };

    const succesGlobal = local.succes;

    if (succesGlobal) {
      console.log(
        `✅ Sauvegarde ${tier} - jeu local OK (${local.setId}), NAS : ${nas.statut}`
      );
    } else {
      console.error(
        `❌ Sauvegarde ${tier} échouée à l'étape "${local.etapeEchec}" : ${local.erreur}`
      );
    }

    // Métadonnées structurées -> audit_logs.details (jsonb). Aucune donnée
    // sensible : ni URL/identifiants BDD, ni hostname NAS, ni clés.
    await logAudit({
      action: succesGlobal
        ? `SAUVEGARDE_${tier.toUpperCase()}`
        : `SAUVEGARDE_${tier.toUpperCase()}_ECHEC`,
      module: 'M10',
      details: {
        backupSetId: local.setId,
        tier,
        localStatus: local.succes ? 'ok' : 'echec',
        nasReplicationStatus: nas.statut,
        databaseSizeBytes: local.database?.sizeBytes ?? null,
        archiveSizeBytes: local.documents?.sizeBytes ?? null,
        fileCount: local.documents?.fileCount ?? null,
        durationMs: local.dureeMs,
        failedStage: local.etapeEchec ?? null,
      },
    });

    return { tier, local, nas, succesGlobal };
  });
}

export function resumerResultat(resultat: ResultatSauvegardeTier): string {
  const { local, nas } = resultat;

  const partieLocale = local.succes
    ? `Local : ${local.setId} (db ${(local.database!.sizeBytes / (1024 * 1024)).toFixed(2)} Mo, ` +
      `docs ${(local.documents!.sizeBytes / (1024 * 1024)).toFixed(2)} Mo, ${local.documents!.fileCount} fichier(s))`
    : `Local : échec à l'étape "${local.etapeEchec}" - ${local.erreur}`;

  const libellesNas: Record<StatutReplicationNas, string> = {
    ok: `NAS : répliqué${nas.chemin ? '' : ''}`,
    echec: `NAS : échec - ${nas.erreur}`,
    non_configure: 'NAS : non configuré',
    indisponible: 'NAS : indisponible (racine absente - non monté ?)',
    ignore: 'NAS : ignoré (jeu local non produit)',
  };

  return `${partieLocale} · ${libellesNas[nas.statut]}`;
}

// ── Promotion d'un palier : nouveau jeu du palier + purge du palier
// inférieur, UNIQUEMENT si le jeu local du palier a réussi (jamais de purge
// avant confirmation). La purge NAS ne s'exécute que si le NAS est
// utilisable.
export async function promouvoirPalier(
  tier: BackupTier,
  tierInferieur: BackupTier | null,
  clesRetention: string,
  retentionDefaut: number
): Promise<{
  resultat: ResultatSauvegardeTier;
  supprimesLocal: string[];
  supprimesNas: string[];
}> {
  const resultat = await effectuerSauvegardeTier(tier);

  let supprimesLocal: string[] = [];
  let supprimesNas: string[] = [];

  if (resultat.succesGlobal && tierInferieur) {
    const nombreAConserver = await getValeurEntier(clesRetention, retentionDefaut);
    const racineLocale = await getRacineLocale();
    supprimesLocal = prunerJeux(racineLocale, tierInferieur, nombreAConserver);

    const gardeNas = nasDestinationUtilisable();
    if (gardeNas.utilisable) {
      supprimesNas = prunerJeux(gardeNas.racine, tierInferieur, nombreAConserver);
    }
  }

  return { resultat, supprimesLocal, supprimesNas };
}

// ── Nombre de jeux distincts purgés - dédoublonne par nom (le même jeu
// supprimé du local ET du NAS ne compte que pour un).
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

// ── Cycle quotidien complet ──────────────────────────────────────────────
// Jeu du jour, puis promotion des paliers dont la frontière calendaire
// tombe aujourd'hui. Chaque étape est enregistrée séparément dans
// l'historique des jobs.
export async function executerCycleSauvegarde(): Promise<void> {
  const debut = new Date();

  const quotidien = await effectuerSauvegardeTier('quotidien');
  await enregistrerExecutionJob({
    jobCle: 'backup_quotidien',
    module: 'M10',
    source: 'cron',
    succes: quotidien.succesGlobal,
    resume: resumerResultat(quotidien),
    erreur: quotidien.succesGlobal ? undefined : quotidien.local.erreur,
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
      resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} jeu(x) quotidien(s) purgé(s).`,
      erreur: resultat.succesGlobal ? undefined : resultat.local.erreur,
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
      resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} jeu(x) hebdomadaire(s) purgé(s).`,
      erreur: resultat.succesGlobal ? undefined : resultat.local.erreur,
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
      resume: `${resumerResultat(resultat)} · ${compterPurges(supprimesLocal, supprimesNas)} jeu(x) mensuel(s) purgé(s). Jeu annuel conservé indéfiniment.`,
      erreur: resultat.succesGlobal ? undefined : resultat.local.erreur,
      dureeMs: Date.now() - debutEtape,
    });
  }
}

// ── Planification - un seul cron quotidien à minuit ──────────────────────
export function demarrerJobsSauvegarde(): void {
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Démarrage du cycle de sauvegarde quotidien...');
    await executerCycleSauvegarde();
  });

  console.log(
    '📅 Cycle de sauvegarde planifié quotidiennement à 00h00 (jeux quotidien/hebdo/mensuel/annuel)'
  );
}

// ── Synchronisation de rattrapage - copie vers le NAS les JEUX complets
// présents en local mais absents du NAS (ex. après une coupure réseau).
// Ne supprime jamais rien, ne copie que local -> NAS, ignore *.inprogress.
export async function synchroniserVersNas(): Promise<{
  copies: string[];
  erreurs: string[];
}> {
  const copies: string[] = [];
  const erreurs: string[] = [];

  const garde = nasDestinationUtilisable();
  if (!garde.utilisable) {
    erreurs.push(`NAS ${garde.raison}`);
    await logAudit({
      action: 'SAUVEGARDE_SYNC_NAS',
      module: 'M10',
      details: { copies: 0, erreurs: 1, nas: garde.raison },
    });
    return { copies, erreurs };
  }

  const racineLocale = await getRacineLocale();
  const tiers: BackupTier[] = ['quotidien', 'hebdomadaire', 'mensuel', 'annuel'];

  for (const tier of tiers) {
    const dirLocal = dossierTier(racineLocale, tier);
    if (!fs.existsSync(dirLocal)) continue;

    const dirNas = dossierTier(garde.racine, tier);
    ensureDir(dirNas);

    const jeuxLocaux = fs
      .readdirSync(dirLocal, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          e.name.startsWith(`backup-${tier}-`) &&
          !e.name.endsWith(SUFFIXE_EN_COURS)
      )
      .map((e) => e.name);
    const jeuxNas = new Set(fs.readdirSync(dirNas));

    for (const nom of jeuxLocaux) {
      if (jeuxNas.has(nom)) continue;
      try {
        const cibleEnCours = path.join(dirNas, nom + SUFFIXE_EN_COURS);
        if (fs.existsSync(cibleEnCours)) {
          fs.rmSync(cibleEnCours, { recursive: true, force: true });
        }
        fs.cpSync(path.join(dirLocal, nom), cibleEnCours, { recursive: true });
        fs.renameSync(cibleEnCours, path.join(dirNas, nom));
        copies.push(`${tier}/${nom}`);
      } catch (error) {
        erreurs.push(
          `${tier}/${nom} : ${error instanceof Error ? error.message : String(error)}`
        );
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
