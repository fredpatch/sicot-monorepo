#!/usr/bin/env node
// Phase 12.3B — Restauration d'un jeu de sauvegarde SICOT (database.sql +
// documents.tar.gz + manifest.json, cf. packages/server/src/jobs/backup.ts).
//
// Outil opérateur, jamais exposé en HTTP. Toujours invoqué explicitement :
// aucun repli implicite sur DATABASE_URL / UPLOAD_DIR / "dernière
// sauvegarde" / palier par défaut. L'opérateur nomme le jeu, la base cible
// et le dossier cible à chaque appel.
//
// Les deux modes ("verify" et "disaster-recovery") exigent une base cible
// VIDE (schéma public sans table) et un dossier d'upload cible inexistant
// ou vide : le dump actuel (`pg_dump --format=plain`, sans --clean) contient
// des CREATE TABLE et échouerait sur un schéma déjà peuplé. Le mode
// disaster-recovery ne contourne jamais cette règle - ses drapeaux
// --confirm-destructive / --confirm-database-name ne font qu'attester que
// l'opérateur a conscience qu'il s'agit d'une restauration réelle ; ils ne
// permettent pas d'empiler le dump sur une base existante. Cet outil
// n'exécute jamais DROP DATABASE / CREATE DATABASE ni ne renomme/efface le
// volume d'upload existant - ces actions restent la responsabilité de
// l'opérateur (cf. docs/operations/restore-drill.md).
//
// Ordre d'exécution (voir docs/operations/restore-drill.md) : l'extraction
// des documents précède la restauration de la base, car un jeu de fichiers
// extrait est trivial à effacer/relancer, alors qu'une base restaurée avec
// succès dont l'extraction des documents échouerait ensuite laisserait un
// état bien plus délicat à communiquer à l'opérateur.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ── Contrat de jeu de sauvegarde (Phase 12.3A, formatVersion 1) ───────────
export const FORMAT_VERSION_SUPPORTEE = 1;
export const NOM_DUMP = 'database.sql';
export const NOM_ARCHIVE = 'documents.tar.gz';
export const NOM_MANIFEST = 'manifest.json';
export const SUFFIXE_EN_COURS = '.inprogress';
export const TIERS_VALIDES = new Set(['quotidien', 'hebdomadaire', 'mensuel', 'annuel']);

// Défaut documenté de UPLOAD_DIR côté application
// (packages/server/src/modules/document/services/documents.constants.ts) -
// utilisé UNIQUEMENT comme valeur par défaut de --original-upload-dir,
// jamais comme repli pour --database-url / --upload-dir eux-mêmes.
export const UPLOAD_DIR_DEFAUT = '/sicot/documents';

const PSQL_BIN = process.env.PSQL_PATH ?? 'psql';
const TAR_BIN = process.env.TAR_PATH ?? 'tar';

// ── Erreur de restauration : porte le "stage" pour le modèle d'erreur ─────
export class RestoreError extends Error {
  constructor(stage, code, message) {
    super(message);
    this.name = 'RestoreError';
    this.stage = stage;
    this.code = code;
  }
}

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

// ── Assainissement des secrets ─────────────────────────────────────────────
// N'affiche jamais l'URL de connexion (identifiants inclus). Toute erreur
// provenant de psql/execFile est réduite à son .message puis assainie AVANT
// de quitter cette fonction - jamais d'objet d'erreur brut propagé.
export function assainirTexte(texte, secrets) {
  let sortie = String(texte ?? '');
  for (const secret of secrets) {
    if (secret) {
      sortie = sortie.split(secret).join('[REDACTED]');
    }
  }
  return sortie;
}

export function analyserUrlBaseDeDonnees(databaseUrl) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new UsageError('--database-url invalide : impossible de la parser comme URL.');
  }
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!dbName) {
    throw new UsageError('--database-url invalide : nom de base de données absent du chemin.');
  }
  return { dbName, host: url.hostname, port: url.port, password: url.password };
}

// ── Analyse des arguments CLI ──────────────────────────────────────────────
export function parseArgs(argv) {
  const args = { confirmDestructive: false };
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (!tok.startsWith('--')) {
      throw new UsageError(`Argument inattendu : ${tok}`);
    }
    const cle = tok.slice(2);
    if (cle === 'confirm-destructive') {
      args.confirmDestructive = true;
      i += 1;
      continue;
    }
    const valeur = argv[i + 1];
    if (valeur === undefined || valeur.startsWith('--')) {
      throw new UsageError(`Valeur manquante pour --${cle}`);
    }
    switch (cle) {
      case 'backup-set':
        args.backupSet = valeur;
        break;
      case 'database-url':
        args.databaseUrl = valeur;
        break;
      case 'upload-dir':
        args.uploadDir = valeur;
        break;
      case 'mode':
        args.mode = valeur;
        break;
      case 'confirm-database-name':
        args.confirmDatabaseName = valeur;
        break;
      case 'original-upload-dir':
        args.originalUploadDir = valeur;
        break;
      default:
        throw new UsageError(`Option inconnue : --${cle}`);
    }
    i += 2;
  }
  return args;
}

export function validerArgs(args) {
  if (args.mode !== 'verify' && args.mode !== 'disaster-recovery') {
    throw new UsageError('--mode doit valoir "verify" ou "disaster-recovery".');
  }
  for (const requis of ['backupSet', 'databaseUrl', 'uploadDir']) {
    if (!args[requis]) {
      throw new UsageError(`Argument requis manquant : --${requis.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`);
    }
  }
  if (args.mode === 'verify') {
    if (args.confirmDestructive || args.confirmDatabaseName) {
      throw new UsageError(
        'Le mode "verify" ne peut pas recevoir de drapeau destructif ' +
          '(--confirm-destructive / --confirm-database-name). Utilisez --mode disaster-recovery.'
      );
    }
  } else {
    if (!args.confirmDestructive) {
      throw new UsageError('Le mode "disaster-recovery" exige --confirm-destructive.');
    }
    if (!args.confirmDatabaseName) {
      throw new UsageError('Le mode "disaster-recovery" exige --confirm-database-name <nom>.');
    }
  }
  return args;
}

// ── Étape 1-2 : validation du dossier + du manifest ────────────────────────
export function validerManifest(backupSetDir) {
  const resolu = path.resolve(backupSetDir);
  if (path.basename(resolu).endsWith(SUFFIXE_EN_COURS)) {
    throw new RestoreError(
      'manifest_validation',
      'JEU_INTROUVABLE',
      'Le dossier désigné est un jeu ".inprogress" (jamais restaurable - il n\'a jamais atteint le renommage atomique final).'
    );
  }
  if (!fs.existsSync(resolu) || !fs.statSync(resolu).isDirectory()) {
    throw new RestoreError('manifest_validation', 'JEU_INTROUVABLE', `Dossier de jeu de sauvegarde introuvable : ${resolu}`);
  }

  const manifestPath = path.join(resolu, NOM_MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    throw new RestoreError('manifest_validation', 'ARTEFACT_MANQUANT', `manifest.json absent de ${resolu}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `manifest.json n'est pas un JSON valide : ${error.message}`);
  }

  if (manifest.formatVersion !== FORMAT_VERSION_SUPPORTEE) {
    throw new RestoreError(
      'manifest_validation',
      'FORMAT_BACKUP_NON_SUPPORTE',
      `formatVersion ${JSON.stringify(manifest.formatVersion)} non supporté (attendu ${FORMAT_VERSION_SUPPORTEE}).`
    );
  }
  if (manifest.backupId !== path.basename(resolu)) {
    throw new RestoreError(
      'manifest_validation',
      'MANIFEST_INVALIDE',
      `backupId du manifest ("${manifest.backupId}") ne correspond pas au nom du dossier ("${path.basename(resolu)}").`
    );
  }
  if (!TIERS_VALIDES.has(manifest.tier)) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `tier invalide dans le manifest : ${JSON.stringify(manifest.tier)}`);
  }
  if (manifest.database?.filename !== NOM_DUMP) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `database.filename doit être exactement "${NOM_DUMP}".`);
  }
  if (manifest.documents?.filename !== NOM_ARCHIVE) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `documents.filename doit être exactement "${NOM_ARCHIVE}".`);
  }
  for (const champ of [
    ['database', 'sizeBytes'],
    ['documents', 'sizeBytes'],
  ]) {
    const val = manifest[champ[0]]?.[champ[1]];
    if (!Number.isInteger(val) || val < 0) {
      throw new RestoreError('manifest_validation', 'TAILLE_INVALIDE', `${champ[0]}.${champ[1]} invalide : ${JSON.stringify(val)}`);
    }
  }
  const sha256Regex = /^[0-9a-f]{64}$/i;
  for (const champ of ['database', 'documents']) {
    const val = manifest[champ]?.sha256;
    if (typeof val !== 'string' || !sha256Regex.test(val)) {
      throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `${champ}.sha256 n'est pas un hex 64 caractères valide.`);
    }
  }
  if (!Number.isInteger(manifest.documents?.fileCount) || manifest.documents.fileCount < 0) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `documents.fileCount invalide : ${JSON.stringify(manifest.documents?.fileCount)}`);
  }

  // Les artefacts doivent résoudre STRICTEMENT à l'intérieur du dossier de
  // jeu (défense en profondeur - les noms sont déjà des littéraux exacts
  // sans séparateur ci-dessus, donc ce contrôle est redondant aujourd'hui,
  // mais protège si une future formatVersion assouplit la règle d'exactitude).
  const dumpPath = resoudreArtefactDansJeu(resolu, manifest.database.filename);
  const archivePath = resoudreArtefactDansJeu(resolu, manifest.documents.filename);

  for (const p of [dumpPath, archivePath]) {
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
      throw new RestoreError('manifest_validation', 'ARTEFACT_MANQUANT', `Artefact attendu manquant ou non-régulier : ${p}`);
    }
  }

  return { manifest, backupSetDir: resolu, dumpPath, archivePath };
}

function resoudreArtefactDansJeu(backupSetDir, filename) {
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `Nom d'artefact suspect : ${filename}`);
  }
  const resolu = path.resolve(backupSetDir, filename);
  const racine = backupSetDir.endsWith(path.sep) ? backupSetDir : backupSetDir + path.sep;
  if (resolu !== path.join(backupSetDir, filename) || !resolu.startsWith(racine)) {
    throw new RestoreError('manifest_validation', 'MANIFEST_INVALIDE', `Artefact hors du dossier de jeu : ${filename}`);
  }
  return resolu;
}

// ── Étape 3 : intégrité (taille + SHA-256) ─────────────────────────────────
function calculerSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function verifierIntegrite(manifest, dumpPath, archivePath) {
  const dumpSize = fs.statSync(dumpPath).size;
  if (dumpSize !== manifest.database.sizeBytes) {
    throw new RestoreError(
      'integrity_validation',
      'TAILLE_INVALIDE',
      `Taille de ${NOM_DUMP} différente du manifest (disque=${dumpSize}, manifest=${manifest.database.sizeBytes}).`
    );
  }
  const archiveSize = fs.statSync(archivePath).size;
  if (archiveSize !== manifest.documents.sizeBytes) {
    throw new RestoreError(
      'integrity_validation',
      'TAILLE_INVALIDE',
      `Taille de ${NOM_ARCHIVE} différente du manifest (disque=${archiveSize}, manifest=${manifest.documents.sizeBytes}).`
    );
  }

  const dumpHash = await calculerSha256(dumpPath);
  if (dumpHash !== manifest.database.sha256) {
    throw new RestoreError('integrity_validation', 'CHECKSUM_INVALIDE', `SHA-256 de ${NOM_DUMP} ne correspond pas au manifest.`);
  }
  const archiveHash = await calculerSha256(archivePath);
  if (archiveHash !== manifest.documents.sha256) {
    throw new RestoreError('integrity_validation', 'CHECKSUM_INVALIDE', `SHA-256 de ${NOM_ARCHIVE} ne correspond pas au manifest.`);
  }
}

// ── Étape 4 : sécurité des entrées de l'archive ────────────────────────────
// Constat empirique (BusyBox tar 1.37, node:20-alpine, cf. rapport
// d'implémentation Phase 12.3B §2) :
//  - `tar -tvzf` imprime une ligne par entrée :
//      <mode> <owner>/<group> <taille> <AAAA-MM-JJ> <HH:MM:SS> <chemin>[ -> <cible>]
//    Les 5 premiers champs ne contiennent jamais d'espace ; le chemin (et la
//    cible de lien éventuelle) peuvent en contenir - d'où l'ancrage sur le
//    format fixe date+heure plutôt qu'un split naïf sur les espaces.
//  - Un répertoire/fichier régulier a pour premier caractère de mode 'd'/'-'.
//  - Un lien symbolique a pour premier caractère 'l' ET porte toujours
//    " -> cible" en fin de ligne.
//  - Un lien physique (hardlink) n'a PAS de caractère de mode distinct : la
//    DEUXIÈME occurrence rencontrée dans l'archive (au sens de l'ordre de
//    parcours de `tar c`, pas de l'ordre alphabétique) porte " -> cible"
//    avec une taille de 0, tandis que la PREMIÈRE occurrence a l'air d'un
//    fichier régulier ordinaire (aucune marque). Rejeter TOUTE ligne
//    contenant " -> " suffit donc à rejeter l'archive entière dès qu'un
//    hardlink y figure, sans avoir à identifier laquelle des deux entrées
//    est "la vraie" - il n'est jamais nécessaire d'extraire un jeu qui en
//    contient un puisque le modèle SICOT n'en produit jamais lui-même.
//  - Chemins absolus et segments ".." : BusyBox tar les neutralise déjà en
//    interne (avertissement "removing leading '/'", puis chemin réellement
//    écrit sous la racine cible) - confirmé empiriquement avec une archive
//    forgée à la main. Les contrôles ci-dessous les rejettent quand même,
//    en défense en profondeur (ne jamais dépendre silencieusement d'un
//    comportement interne non documenté d'une version particulière de tar).
const LIGNE_TVZF_REGEX = /^(\S+)\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(.*)$/;

export async function validerSecuriteArchive(archivePath) {
  const { stdout } = await execFileAsync(TAR_BIN, ['-tvzf', archivePath]);
  const lignes = stdout.split('\n').filter((l) => l.length > 0);

  let nombreEntreesFichierAttendu = 0;

  for (const ligne of lignes) {
    const m = ligne.match(LIGNE_TVZF_REGEX);
    if (!m) {
      throw new RestoreError('archive_validation', 'ARCHIVE_ENTREE_DANGEREUSE', `Ligne de listing d'archive illisible - rejet par prudence : ${JSON.stringify(ligne)}`);
    }
    const mode = m[1];
    const cheminEtLien = m[5];
    const typeChar = mode[0];

    if (typeChar !== '-' && typeChar !== 'd') {
      throw new RestoreError(
        'archive_validation',
        'ARCHIVE_ENTREE_DANGEREUSE',
        `Entrée d'archive de type non autorisé ("${typeChar}", attendu fichier régulier ou répertoire) : ${cheminEtLien}`
      );
    }
    if (cheminEtLien.includes(' -> ')) {
      throw new RestoreError('archive_validation', 'ARCHIVE_ENTREE_DANGEREUSE', `Lien (symbolique ou physique) détecté dans l'archive : ${cheminEtLien}`);
    }

    const chemin = cheminEtLien;
    if (chemin.startsWith('/')) {
      throw new RestoreError('archive_validation', 'ARCHIVE_ENTREE_DANGEREUSE', `Chemin absolu dans l'archive : ${chemin}`);
    }
    if (chemin.split('/').includes('..')) {
      throw new RestoreError('archive_validation', 'ARCHIVE_ENTREE_DANGEREUSE', `Segment ".." dans l'archive : ${chemin}`);
    }

    if (typeChar === '-') {
      nombreEntreesFichierAttendu += 1;
    }
  }

  return { nombreEntreesFichierAttendu };
}

// ── Étape 5 : base cible vide (les deux modes) ─────────────────────────────
async function executerPsql(databaseUrl, argsSupplementaires, secretsASanitiser) {
  try {
    return await execFileAsync(PSQL_BIN, [databaseUrl, '--no-password', '-v', 'ON_ERROR_STOP=1', ...argsSupplementaires]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(assainirTexte(message, secretsASanitiser));
  }
}

export async function validerCibleBddVide(databaseUrl, secretsASanitiser) {
  let stdout;
  try {
    ({ stdout } = await executerPsql(
      databaseUrl,
      ['-t', '-A', '-c', "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"],
      secretsASanitiser
    ));
  } catch (error) {
    throw new RestoreError('database_target_validation', 'CIBLE_BDD_VERIFICATION_ECHEC', error.message);
  }
  const n = parseInt(stdout.trim(), 10);
  if (!Number.isFinite(n)) {
    throw new RestoreError('database_target_validation', 'CIBLE_BDD_VERIFICATION_ECHEC', 'Réponse psql inattendue lors de la vérification de vacuité.');
  }
  if (n > 0) {
    throw new RestoreError(
      'database_target_validation',
      'CIBLE_BDD_NON_VIDE',
      `La base cible contient ${n} table(s) dans le schéma public. Le dump actuel (sans --clean) exige une base vide.`
    );
  }
}

// ── Étape 6 : dossier d'upload cible inexistant ou vide (les deux modes) ──
export function validerCibleUploadVide(uploadDir) {
  const resolu = path.resolve(uploadDir);
  if (!fs.existsSync(resolu)) return;
  if (!fs.statSync(resolu).isDirectory()) {
    throw new RestoreError('upload_target_validation', 'CIBLE_UPLOAD_NON_VIDE', `--upload-dir existe mais n'est pas un répertoire : ${resolu}`);
  }
  const entries = fs.readdirSync(resolu);
  if (entries.length > 0) {
    throw new RestoreError(
      'upload_target_validation',
      'CIBLE_UPLOAD_NON_VIDE',
      `--upload-dir n'est pas vide (${entries.length} entrée(s)). L'outil n'efface/ne renomme jamais un dossier existant - préparez une cible vide.`
    );
  }
}

// ── Étape 7-8 : extraction des documents + validation du nombre extrait ───
function walkerRepertoire(dir, racineReelle) {
  let fichiers = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      throw new RestoreError('document_restore', 'ARCHIVE_ENTREE_DANGEREUSE', `Lien symbolique détecté après extraction (inattendu) : ${p}`);
    }
    const reel = fs.realpathSync(p);
    if (reel !== racineReelle && !reel.startsWith(racineReelle + path.sep)) {
      throw new RestoreError('document_restore', 'ARCHIVE_ENTREE_DANGEREUSE', `Fichier extrait hors de la cible attendue : ${p}`);
    }
    if (e.isDirectory()) {
      fichiers += walkerRepertoire(p, racineReelle);
    } else if (e.isFile()) {
      fichiers += 1;
    } else {
      throw new RestoreError('document_restore', 'ARCHIVE_ENTREE_DANGEREUSE', `Entrée extraite de type inattendu (ni fichier ni répertoire) : ${p}`);
    }
  }
  return fichiers;
}

export async function restaurerDocuments(archivePath, uploadDir, fileCountAttendu) {
  const resolu = path.resolve(uploadDir);
  if (!fs.existsSync(resolu)) {
    fs.mkdirSync(resolu, { recursive: true });
  }

  try {
    await execFileAsync(TAR_BIN, ['-xzf', archivePath, '-C', resolu]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RestoreError('document_restore', 'ARCHIVE_ENTREE_DANGEREUSE', `Échec d'extraction de l'archive : ${message}`);
  }

  const racineReelle = fs.realpathSync(resolu);
  const nombreExtrait = walkerRepertoire(resolu, racineReelle);

  if (nombreExtrait !== fileCountAttendu) {
    throw new RestoreError(
      'document_restore',
      'NOMBRE_FICHIERS_INCOHERENT',
      `Nombre de fichiers extraits (${nombreExtrait}) différent de manifest.documents.fileCount (${fileCountAttendu}).`
    );
  }

  return { nombreExtrait };
}

// ── Étape 9 : restauration base de données ─────────────────────────────────
export async function restaurerBaseDeDonnees(databaseUrl, dumpPath, secretsASanitiser) {
  try {
    await execFileAsync(PSQL_BIN, [
      databaseUrl,
      '--no-password',
      '-v',
      'ON_ERROR_STOP=1',
      '--single-transaction',
      '-f',
      dumpPath,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RestoreError('database_restore', 'RESTAURATION_BDD_ECHEC', assainirTexte(message, secretsASanitiser));
  }
}

// ── Étape 10-11 : validation post-restauration ─────────────────────────────
export async function validerPostRestauration(databaseUrl, secretsASanitiser, originalUploadDir, uploadDir) {
  let tablesPresentes;
  try {
    const { stdout } = await executerPsql(
      databaseUrl,
      [
        '-t',
        '-A',
        '-c',
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('documents','parametres');",
      ],
      secretsASanitiser
    );
    tablesPresentes = new Set(stdout.split('\n').map((l) => l.trim()).filter(Boolean));
  } catch (error) {
    throw new RestoreError('post_restore_validation', 'VALIDATION_POST_RESTAURATION_ECHEC', error.message);
  }

  for (const table of ['documents', 'parametres']) {
    if (!tablesPresentes.has(table)) {
      throw new RestoreError('post_restore_validation', 'VALIDATION_POST_RESTAURATION_ECHEC', `Table attendue absente après restauration : public.${table}`);
    }
  }

  // Cohérence chemin BDD <-> fichiers restaurés. documents.chemin stocke un
  // chemin ABSOLU construit au moment de l'upload d'origine
  // (path.join(UPLOAD_DIR, sous-dossier, nomFichier) - cf.
  // documents.constants.ts / documents.service.ts). On ne réécrit JAMAIS ces
  // lignes ; on dérive seulement le chemin relatif sous l'UPLOAD_DIR
  // d'origine puis on le reprojette sous --upload-dir pour vérifier que le
  // fichier existe bien après restauration. Toutes les lignes (y compris les
  // documents dans la corbeille) sont incluses : un document soft-supprimé
  // conserve son fichier physique dans le modèle actuel (Phase 12.2), donc
  // son entrée doit exister dans l'archive au même titre qu'un document actif.
  let chemins = [];
  try {
    const { stdout } = await executerPsql(databaseUrl, ['-t', '-A', '-c', 'SELECT chemin FROM documents;'], secretsASanitiser);
    chemins = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (error) {
    throw new RestoreError('post_restore_validation', 'VALIDATION_POST_RESTAURATION_ECHEC', error.message);
  }

  const racineOriginale = path.resolve(originalUploadDir);
  const cibleRestauration = path.resolve(uploadDir);
  let valides = 0;
  const invalidesDetail = [];
  for (const chemin of chemins) {
    const cheminResolu = path.resolve(chemin);
    const relatif = path.relative(racineOriginale, cheminResolu);
    if (relatif.startsWith('..') || path.isAbsolute(relatif)) {
      invalidesDetail.push(chemin);
      continue;
    }
    const cible = path.join(cibleRestauration, relatif);
    if (fs.existsSync(cible) && fs.statSync(cible).isFile()) {
      valides += 1;
    } else {
      invalidesDetail.push(chemin);
    }
  }

  const documentChemins = {
    total: chemins.length,
    valides,
    invalides: invalidesDetail.length,
    invalidesEchantillon: invalidesDetail.slice(0, 20),
  };

  return {
    tablesRestaurees: [...tablesPresentes].sort(),
    documentChemins,
  };
}

// ── Orchestration principale ────────────────────────────────────────────────
export async function executerRestauration(args) {
  const debut = Date.now();
  const secretsASanitiser = [args.databaseUrl];
  let dbInfo;
  try {
    dbInfo = analyserUrlBaseDeDonnees(args.databaseUrl);
    if (dbInfo.password) secretsASanitiser.push(dbInfo.password);
  } catch (error) {
    return {
      succes: false,
      mode: args.mode,
      failedStage: 'manifest_validation',
      erreur: error.message,
      durationMs: Date.now() - debut,
    };
  }

  if (args.mode === 'disaster-recovery' && args.confirmDatabaseName !== dbInfo.dbName) {
    return {
      succes: false,
      mode: args.mode,
      databaseName: dbInfo.dbName,
      failedStage: 'database_target_validation',
      erreur: `--confirm-database-name ("${args.confirmDatabaseName}") ne correspond pas au nom de base analysé depuis --database-url ("${dbInfo.dbName}").`,
      code: 'CONFIRMATION_NOM_BDD_INVALIDE',
      durationMs: Date.now() - debut,
    };
  }

  const originalUploadDir = args.originalUploadDir ?? UPLOAD_DIR_DEFAUT;

  const base = {
    mode: args.mode,
    backupId: undefined,
    tier: undefined,
    databaseName: dbInfo.dbName,
    uploadDir: path.resolve(args.uploadDir),
  };

  try {
    const { manifest, dumpPath, archivePath } = validerManifest(args.backupSet);
    base.backupId = manifest.backupId;
    base.tier = manifest.tier;

    await verifierIntegrite(manifest, dumpPath, archivePath);

    await validerSecuriteArchive(archivePath);

    await validerCibleBddVide(args.databaseUrl, secretsASanitiser);

    validerCibleUploadVide(args.uploadDir);

    const { nombreExtrait } = await restaurerDocuments(archivePath, args.uploadDir, manifest.documents.fileCount);

    await restaurerBaseDeDonnees(args.databaseUrl, dumpPath, secretsASanitiser);

    const validationPostRestauration = await validerPostRestauration(args.databaseUrl, secretsASanitiser, originalUploadDir, args.uploadDir);

    const validation = {
      fichiersExtraits: nombreExtrait,
      ...validationPostRestauration,
    };

    // Une ligne documents.chemin qui ne mappe à aucun fichier restauré
    // signifie que ce n'est PAS une reprise valide, même si la base et
    // l'extraction ont chacune "réussi" individuellement - le résultat
    // global doit le refléter sans ambiguïté. Le diagnostic (compte +
    // échantillon plafonné) reste dans `validation` pour les deux issues.
    // Aucune tentative de rollback ici (la BDD est potentiellement déjà
    // restaurée à ce stade) : on rend seulement l'échec explicite.
    if (validation.documentChemins.invalides > 0) {
      return {
        succes: false,
        ...base,
        failedStage: 'post_restore_validation',
        code: 'VALIDATION_POST_RESTAURATION_ECHEC',
        erreur:
          `${validation.documentChemins.invalides}/${validation.documentChemins.total} ligne(s) documents.chemin ne ` +
          `correspond(ent) à aucun fichier restauré - reprise incomplète/invalide.`,
        durationMs: Date.now() - debut,
        validation,
      };
    }

    return {
      succes: true,
      ...base,
      durationMs: Date.now() - debut,
      validation,
    };
  } catch (error) {
    const failedStage = error instanceof RestoreError ? error.stage : 'manifest_validation';
    const code = error instanceof RestoreError ? error.code : undefined;
    const message = assainirTexte(error.message, secretsASanitiser);
    return {
      succes: false,
      ...base,
      failedStage,
      code,
      erreur: message,
      durationMs: Date.now() - debut,
    };
  }
}

// ── Point d'entrée CLI ──────────────────────────────────────────────────────
async function main() {
  let args;
  try {
    args = validerArgs(parseArgs(process.argv.slice(2)));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`[restore-backup] ${error.message}`);
      console.error(
        '\nUsage :\n' +
          '  node scripts/restore-backup.mjs --backup-set <chemin> --database-url <url> ' +
          '--upload-dir <chemin> --mode verify\n' +
          '  node scripts/restore-backup.mjs --backup-set <chemin> --database-url <url> ' +
          '--upload-dir <chemin> --mode disaster-recovery --confirm-destructive ' +
          '--confirm-database-name <nom>\n\n' +
          'Optionnel : --original-upload-dir <chemin> (défaut : ' +
          UPLOAD_DIR_DEFAUT +
          ') - UPLOAD_DIR du système qui a produit la sauvegarde, utilisé pour ' +
          'vérifier la cohérence documents.chemin <-> fichiers restaurés.'
      );
      process.exit(1);
    }
    throw error;
  }

  const resultat = await executerRestauration(args);
  console.log(JSON.stringify(resultat, null, 2));
  process.exit(resultat.succes ? 0 : 1);
}

// N'exécuter automatiquement que si ce fichier est le point d'entrée direct
// (permet l'import des fonctions ci-dessus depuis les tests / le harnais CI
// sans déclencher une exécution CLI).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[restore-backup] Erreur inattendue :', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
