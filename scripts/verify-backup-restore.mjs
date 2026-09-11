#!/usr/bin/env node
// Phase 12.3B - preuve d'un cycle sauvegarde -> restauration réel, contre un
// vrai PostgreSQL jetable, avec des données strictement synthétiques.
//
// Dogfoode le vrai CLI de restauration (scripts/restore-backup.mjs) en
// l'invoquant comme un opérateur le ferait (processus externe, arguments
// explicites) plutôt que d'importer ses fonctions internes - la preuve doit
// porter sur l'outil réellement utilisable, pas seulement sur sa logique.
//
// Prérequis (fournis par l'étape CI dédiée / à reproduire localement) :
//   - DATABASE_URL pointe vers un PostgreSQL jetable DÉJÀ MIGRÉ
//     (npm run db:migrate --workspace=packages/server)
//   - packages/shared/dist et packages/server/dist sont déjà construits
//     (npm run build --workspace=packages/shared / packages/server)
//   - pg_dump / psql / tar / gzip sont disponibles dans le PATH
//
// Aucune donnée de production. Nettoyage strictement limité aux ressources
// créées par CETTE exécution (jamais docker volume prune / system prune ou
// équivalent) - voir le bloc `finally`.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PSQL_BIN = process.env.PSQL_PATH ?? 'psql';

function log(message) {
  console.log(`[verify-backup-restore] ${message}`);
}

class HarnessError extends Error {}

async function psql(databaseUrl, sql) {
  const { stdout } = await execFileAsync(PSQL_BIN, [databaseUrl, '--no-password', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql]);
  return stdout;
}

function urlAvecBase(sourceUrl, dbName) {
  const u = new URL(sourceUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

async function main() {
  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) {
    throw new HarnessError('DATABASE_URL doit être défini (PostgreSQL jetable déjà migré, synthétique uniquement).');
  }

  const runId = `restore-verify-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const marqueur = `PHASE_12_3B_MARKER_${crypto.randomBytes(4).toString('hex')}`;
  const restoreDbName = `sicot_${runId.replace(/[^a-z0-9]/gi, '_')}`;
  const restoreUrl = urlAvecBase(sourceUrl, restoreDbName);
  const adminUrl = urlAvecBase(sourceUrl, 'postgres');

  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), `sicot-${runId}-`));
  const uploadDirSource = path.join(scratchRoot, 'uploads-source');
  const backupLocalDir = path.join(scratchRoot, 'backups-local');
  const restoreUploadDir = path.join(scratchRoot, 'uploads-restored');

  let dbCreated = false;
  let userId = null;

  try {
    // 1. Arbre d'upload synthétique - créé AVANT la sauvegarde pour être
    //    inclus dans documents.tar.gz.
    fs.mkdirSync(path.join(uploadDirSource, 'missions'), { recursive: true });
    const contenuFichier = 'synthetic content for Phase 12.3B restore verification\n';
    const nomFichier = 'synthetic-report.txt';
    fs.writeFileSync(path.join(uploadDirSource, 'missions', nomFichier), contenuFichier);

    // 2. Données synthétiques dans la base source : un marqueur distinctif
    //    (parametres) + un utilisateur + une ligne documents référençant
    //    réellement le fichier synthétique ci-dessus, pour exercer la
    //    validation de cohérence chemin <-> fichier restauré.
    log('Insertion des données synthétiques dans la base source...');
    await psql(
      sourceUrl,
      `INSERT INTO parametres (cle, valeur, type, module, description) VALUES ` +
        `('phase_12_3b_marker', '${marqueur}', 'texte', 'M10', 'Marqueur synthetique Phase 12.3B - jetable, verify-backup-restore.mjs');`
    );
    await psql(
      sourceUrl,
      `INSERT INTO users (matricule, nom, prenom, email, role, actif) VALUES ` +
        `('RESTVERIFY', 'Verify', 'Restore', 'restore-verify-${runId}@example.invalid', 'agent', false);`
    );
    userId = (await psql(sourceUrl, `SELECT id FROM users WHERE matricule = 'RESTVERIFY';`)).trim();

    const cheminDocument = path.join(uploadDirSource, 'missions', nomFichier).replace(/'/g, "''");
    const hashMD5 = crypto.createHash('md5').update(contenuFichier).digest('hex');
    await psql(
      sourceUrl,
      `INSERT INTO documents (nom, nom_original, chemin, mime_type, taille, categorie, hash_md5, uploade_par) VALUES ` +
        `('${nomFichier}', '${nomFichier}', '${cheminDocument}', 'text/plain', ${Buffer.byteLength(contenuFichier)}, 'mission', '${hashMD5}', ${userId});`
    );

    // 3. Sauvegarde réelle via le job compilé (pg_dump / tar / SHA-256 /
    //    manifest / renommage atomique réels - rien de simulé ici).
    log('Exécution de effectuerSauvegardeTier (job de sauvegarde compilé, Phase 12.3A)...');
    process.env.DATABASE_URL = sourceUrl;
    process.env.UPLOAD_DIR = uploadDirSource;
    process.env.BACKUP_LOCAL_DIR = backupLocalDir;
    process.env.BACKUP_NAS_DIR = ''; // réplication NAS déjà prouvée en 12.3A, hors périmètre ici

    const backupModuleUrl = new URL('../packages/server/dist/jobs/backup.js', import.meta.url);
    const { effectuerSauvegardeTier } = await import(backupModuleUrl.href);
    const resultatSauvegarde = await effectuerSauvegardeTier('quotidien');
    if (!resultatSauvegarde.succesGlobal || !resultatSauvegarde.local.cheminFinal) {
      throw new HarnessError(`La sauvegarde synthétique a échoué : ${JSON.stringify(resultatSauvegarde)}`);
    }
    log(`Jeu de sauvegarde créé : ${resultatSauvegarde.local.setId}`);

    // 4. Base de restauration vide, créée par le harnais - qui joue ici le
    //    rôle de "l'opérateur" préparant la cible avant d'invoquer le CLI
    //    (le CLI lui-même n'exécute jamais CREATE DATABASE).
    log(`Création de la base de restauration jetable : ${restoreDbName}`);
    await psql(adminUrl, `CREATE DATABASE ${restoreDbName};`);
    dbCreated = true;

    // 5. Invocation du vrai CLI, en tant que processus externe (dogfooding).
    log('Invocation de scripts/restore-backup.mjs (processus externe, --mode verify)...');
    const cliArgs = [
      path.join(REPO_ROOT, 'scripts', 'restore-backup.mjs'),
      '--backup-set',
      resultatSauvegarde.local.cheminFinal,
      '--database-url',
      restoreUrl,
      '--upload-dir',
      restoreUploadDir,
      '--mode',
      'verify',
      '--original-upload-dir',
      uploadDirSource,
    ];

    let restoreStdout;
    try {
      ({ stdout: restoreStdout } = await execFileAsync('node', cliArgs, { cwd: REPO_ROOT }));
    } catch (error) {
      // execFile rejette sur code de sortie != 0, mais le CLI écrit son
      // résultat JSON structuré sur stdout avant de sortir en erreur.
      restoreStdout = error.stdout;
      if (!restoreStdout) {
        throw new HarnessError(`Le CLI de restauration a échoué sans sortie exploitable : ${error.message}`);
      }
    }

    let resultatRestauration;
    try {
      resultatRestauration = JSON.parse(restoreStdout);
    } catch {
      throw new HarnessError(`Sortie du CLI de restauration non-JSON :\n${restoreStdout}`);
    }

    if (!resultatRestauration.succes) {
      throw new HarnessError(
        `La restauration a échoué à l'étape "${resultatRestauration.failedStage}" (${resultatRestauration.code}) : ${resultatRestauration.erreur}`
      );
    }
    log(`Restauration réussie en ${resultatRestauration.durationMs} ms. Validation : ${JSON.stringify(resultatRestauration.validation)}`);

    // 6. Vérifications INDÉPENDANTES du résultat du CLI - le harnais ne se
    //    fie pas uniquement à "succes: true", il revérifie lui-même le
    //    marqueur en base et le fichier sur disque.
    const marqueurRestaure = (await psql(restoreUrl, `SELECT valeur FROM parametres WHERE cle = 'phase_12_3b_marker';`)).trim();
    if (marqueurRestaure !== marqueur) {
      throw new HarnessError(`Marqueur restauré ("${marqueurRestaure}") différent du marqueur synthétique inséré ("${marqueur}").`);
    }
    log('Marqueur synthétique retrouvé dans la base restaurée (vérification indépendante).');

    const fichierRestaure = path.join(restoreUploadDir, 'missions', nomFichier);
    if (!fs.existsSync(fichierRestaure) || fs.readFileSync(fichierRestaure, 'utf8') !== contenuFichier) {
      throw new HarnessError(`Fichier synthétique absent ou contenu différent après restauration : ${fichierRestaure}`);
    }
    log('Fichier synthétique retrouvé avec le contenu attendu (vérification indépendante).');

    if (resultatRestauration.validation.documentChemins.total !== 1 || resultatRestauration.validation.documentChemins.valides !== 1) {
      throw new HarnessError(
        `Cohérence documents.chemin <-> fichiers restaurés inattendue : ${JSON.stringify(resultatRestauration.validation.documentChemins)}`
      );
    }
    log('Cohérence documents.chemin <-> fichier restauré confirmée (1/1).');

    log('SUCCÈS : cycle sauvegarde -> restauration synthétique complet, réel et vérifié.');
  } finally {
    log('Nettoyage des ressources créées par ce run (uniquement celles-ci)...');
    if (dbCreated) {
      try {
        await psql(adminUrl, `DROP DATABASE IF EXISTS ${restoreDbName};`);
      } catch (error) {
        console.error(`[verify-backup-restore] Avertissement : échec du nettoyage de la base "${restoreDbName}" : ${error.message}`);
      }
    }
    if (userId) {
      try {
        await psql(sourceUrl, `DELETE FROM documents WHERE uploade_par = ${userId};`);
        await psql(sourceUrl, `DELETE FROM users WHERE id = ${userId};`);
        await psql(sourceUrl, `DELETE FROM parametres WHERE cle = 'phase_12_3b_marker';`);
      } catch (error) {
        console.error(`[verify-backup-restore] Avertissement : échec du nettoyage des lignes synthétiques de la base source : ${error.message}`);
      }
    }
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[verify-backup-restore] ÉCHEC : ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
