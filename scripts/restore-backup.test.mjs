// Tests ciblés pour scripts/restore-backup.mjs (Phase 12.3B).
//
// Seule la frontière child_process (tar/psql) est mockée - manifest,
// checksum, sécurité d'archive et cohérence de chemins s'exécutent contre de
// vrais fichiers temporaires sur disque, jamais contre une réponse fs
// simulée. La preuve d'une restauration réelle contre un vrai PostgreSQL
// (pg_dump/psql/tar réels) vient du job CI séparé "restore-verify"
// (scripts/verify-backup-restore.mjs), pas de ce fichier.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import * as realUtil from 'node:util';

const state = vi.hoisted(() => ({
  tarListing: '',
  extractFiles: /** @type {{rel: string, content: string}[]} */ ([]),
  tarExtractFail: false,
  psqlEmptyCount: '0',
  psqlPostTables: 'documents\nparametres',
  psqlChemins: '',
  psqlRestoreFail: null,
  psqlTargetCheckFail: null,
  lastRestoreArgs: /** @type {string[] | null} */ (null),
}));

vi.mock('node:child_process', () => {
  const impl = (file, args, cb) => {
    const bin = String(file);
    if (bin.includes('tar')) {
      if (args[0] === '-tvzf') {
        cb(null, state.tarListing, '');
        return;
      }
      if (args[0] === '-xzf') {
        if (state.tarExtractFail) {
          cb(new Error('tar extraction failed (simulated)'));
          return;
        }
        const targetDir = args[3];
        for (const f of state.extractFiles) {
          const dest = path.join(targetDir, f.rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, f.content);
        }
        cb(null, '', '');
        return;
      }
      cb(new Error(`unexpected tar args in mock: ${JSON.stringify(args)}`));
      return;
    }
    if (bin.includes('psql')) {
      const sql = args.join(' ');
      if (sql.includes("count(*) FROM information_schema.tables WHERE table_schema = 'public';")) {
        if (state.psqlTargetCheckFail) {
          cb(new Error(state.psqlTargetCheckFail));
          return;
        }
        cb(null, state.psqlEmptyCount + '\n', '');
        return;
      }
      if (sql.includes("table_name IN ('documents','parametres')")) {
        cb(null, state.psqlPostTables + '\n', '');
        return;
      }
      if (sql.includes('SELECT chemin FROM documents;')) {
        cb(null, state.psqlChemins, '');
        return;
      }
      if (args.includes('--single-transaction')) {
        state.lastRestoreArgs = args;
        if (state.psqlRestoreFail) {
          cb(new Error(state.psqlRestoreFail));
          return;
        }
        cb(null, '', '');
        return;
      }
      cb(new Error(`unexpected psql args in mock: ${JSON.stringify(args)}`));
      return;
    }
    cb(new Error(`unexpected executable in mock: ${bin}`));
  };
  impl[realUtil.promisify.custom] = (file, args) =>
    new Promise((resolve, reject) => {
      impl(file, args, (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr })));
    });
  return { execFile: impl };
});

const mod = await import('./restore-backup.mjs');
const {
  parseArgs,
  validerArgs,
  validerManifest,
  verifierIntegrite,
  validerSecuriteArchive,
  validerCibleBddVide,
  validerCibleUploadVide,
  restaurerDocuments,
  restaurerBaseDeDonnees,
  validerPostRestauration,
  executerRestauration,
  assainirTexte,
  analyserUrlBaseDeDonnees,
  RestoreError,
  UPLOAD_DIR_DEFAUT,
} = mod;

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function creerJeuValide(baseDir, { tier = 'quotidien', fileCount = 1, corromprePropriete = null } = {}) {
  const backupId = `backup-${tier}-2026-09-11T00-00-00-abc123`;
  const dir = path.join(baseDir, backupId);
  fs.mkdirSync(dir, { recursive: true });

  const dumpPath = path.join(dir, 'database.sql');
  fs.writeFileSync(dumpPath, 'CREATE TABLE t (id int);\n'.repeat(50));
  const archivePath = path.join(dir, 'documents.tar.gz');
  fs.writeFileSync(archivePath, Buffer.from('fake-archive-bytes-for-manifest-tests'));

  const manifest = {
    formatVersion: 1,
    backupId,
    tier,
    createdAt: new Date().toISOString(),
    database: { filename: 'database.sql', sizeBytes: fs.statSync(dumpPath).size, sha256: sha256(dumpPath) },
    documents: { filename: 'documents.tar.gz', sizeBytes: fs.statSync(archivePath).size, sha256: sha256(archivePath), fileCount },
    applicationVersion: null,
  };
  if (corromprePropriete) corromprePropriete(manifest);

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { dir, manifest, dumpPath, archivePath };
}

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-backup-test-'));
  state.tarListing = '';
  state.extractFiles = [];
  state.tarExtractFail = false;
  state.psqlEmptyCount = '0';
  state.psqlPostTables = 'documents\nparametres';
  state.psqlChemins = '';
  state.psqlRestoreFail = null;
  state.psqlTargetCheckFail = null;
  state.lastRestoreArgs = null;
});

// ── Manifest validation ─────────────────────────────────────────────────
describe('validerManifest', () => {
  it('accepte un jeu conforme', () => {
    const { dir } = creerJeuValide(tmp);
    const result = validerManifest(dir);
    expect(result.manifest.formatVersion).toBe(1);
  });

  it('rejette un dossier .inprogress', () => {
    const { dir } = creerJeuValide(tmp);
    const enCours = dir + '.inprogress';
    fs.renameSync(dir, enCours);
    expect(() => validerManifest(enCours)).toThrow(RestoreError);
    try {
      validerManifest(enCours);
    } catch (e) {
      expect(e.stage).toBe('manifest_validation');
      expect(e.code).toBe('JEU_INTROUVABLE');
    }
  });

  it('rejette un dossier inexistant', () => {
    expect(() => validerManifest(path.join(tmp, 'does-not-exist'))).toThrow(/introuvable/);
  });

  it('rejette manifest.json manquant', () => {
    const dir = path.join(tmp, 'backup-quotidien-x');
    fs.mkdirSync(dir);
    try {
      validerManifest(dir);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('ARTEFACT_MANQUANT');
    }
  });

  it('rejette un formatVersion non supporté', () => {
    const { dir } = creerJeuValide(tmp, { corromprePropriete: (m) => (m.formatVersion = 2) });
    try {
      validerManifest(dir);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('FORMAT_BACKUP_NON_SUPPORTE');
    }
  });

  it('rejette un manifest.json invalide (JSON cassé)', () => {
    const { dir } = creerJeuValide(tmp);
    fs.writeFileSync(path.join(dir, 'manifest.json'), '{ not json');
    try {
      validerManifest(dir);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MANIFEST_INVALIDE');
    }
  });

  it('rejette un backupId ne correspondant pas au nom du dossier', () => {
    const { dir, manifest } = creerJeuValide(tmp);
    manifest.backupId = 'backup-quotidien-tampered';
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
    try {
      validerManifest(dir);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MANIFEST_INVALIDE');
    }
  });
});

// ── Integrity validation ────────────────────────────────────────────────
describe('verifierIntegrite', () => {
  it('accepte quand tailles et SHA-256 correspondent', async () => {
    const { manifest, dumpPath, archivePath } = creerJeuValide(tmp);
    await expect(verifierIntegrite(manifest, dumpPath, archivePath)).resolves.toBeUndefined();
  });

  it('rejette une taille incohérente', async () => {
    const { manifest, dumpPath, archivePath } = creerJeuValide(tmp);
    fs.appendFileSync(dumpPath, 'EXTRA DATA');
    await expect(verifierIntegrite(manifest, dumpPath, archivePath)).rejects.toMatchObject({ code: 'TAILLE_INVALIDE' });
  });

  it('rejette un SHA-256 incohérent (même taille)', async () => {
    const { manifest, dumpPath, archivePath } = creerJeuValide(tmp);
    const original = fs.readFileSync(dumpPath);
    const mutated = Buffer.from(original);
    mutated[0] = mutated[0] === 65 ? 66 : 65;
    fs.writeFileSync(dumpPath, mutated);
    // même taille, contenu différent -> même sizeBytes mais SHA-256 différent
    expect(fs.statSync(dumpPath).size).toBe(manifest.database.sizeBytes);
    await expect(verifierIntegrite(manifest, dumpPath, archivePath)).rejects.toMatchObject({ code: 'CHECKSUM_INVALIDE' });
  });
});

// ── Archive entry safety (empirical BusyBox tar format) ────────────────
describe('validerSecuriteArchive', () => {
  it('accepte des fichiers réguliers et répertoires ordinaires', async () => {
    state.tarListing = [
      'drwxr-xr-x root/root         0 2026-09-11 06:01:57 ./',
      '-rw-r--r-- root/root         8 2026-09-11 06:01:57 ./cafe-resume-unicode.txt',
      'drwxr-xr-x root/root         0 2026-09-11 06:01:57 ./sub/',
      '-rw-r--r-- root/root         7 2026-09-11 06:01:57 ./sub/nested file.txt',
    ].join('\n');
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).resolves.toMatchObject({ nombreEntreesFichierAttendu: 2 });
  });

  it('rejette un lien symbolique', async () => {
    state.tarListing = 'lrwxrwxrwx root/root 0 2026-09-11 06:01:57 ./evil.txt -> regular.txt';
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).rejects.toMatchObject({ code: 'ARCHIVE_ENTREE_DANGEREUSE' });
  });

  it('rejette un lien physique (hardlink, ligne portant " -> ")', async () => {
    state.tarListing = [
      '-rw-r--r-- root/root 6 2026-09-11 06:01:57 ./hardlink-to-regular.txt',
      '-rw-r--r-- root/root 0 2026-09-11 06:01:57 ./regular file.txt -> ./hardlink-to-regular.txt',
    ].join('\n');
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).rejects.toMatchObject({ code: 'ARCHIVE_ENTREE_DANGEREUSE' });
  });

  it('rejette un chemin absolu', async () => {
    state.tarListing = '-rw-r--r-- root/root 4 2026-09-11 06:01:57 /absolute/evil.txt';
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).rejects.toMatchObject({ code: 'ARCHIVE_ENTREE_DANGEREUSE' });
  });

  it('rejette un segment ".." (traversée de répertoire)', async () => {
    state.tarListing = '-rw-r--r-- root/root 4 2026-09-11 06:01:57 ../../etc/evil.txt';
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).rejects.toMatchObject({ code: 'ARCHIVE_ENTREE_DANGEREUSE' });
  });

  it('rejette une entrée de type spécial (FIFO)', async () => {
    state.tarListing = 'prw-r--r-- root/root 0 2026-09-11 06:01:57 ./fifo-special';
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).rejects.toMatchObject({ code: 'ARCHIVE_ENTREE_DANGEREUSE' });
  });

  it('rejette une ligne de listing illisible plutôt que de l\'ignorer', async () => {
    state.tarListing = 'not a recognizable tar -tvzf line at all';
    await expect(validerSecuriteArchive('/fake/archive.tar.gz')).rejects.toMatchObject({ code: 'ARCHIVE_ENTREE_DANGEREUSE' });
  });
});

// ── Database target emptiness ────────────────────────────────────────────
describe('validerCibleBddVide', () => {
  it('accepte une base vide (count = 0)', async () => {
    state.psqlEmptyCount = '0';
    await expect(validerCibleBddVide('postgres://u:p@h:5432/db', ['postgres://u:p@h:5432/db'])).resolves.toBeUndefined();
  });

  it('rejette une base non vide en mode implicite (aucune dérogation)', async () => {
    state.psqlEmptyCount = '3';
    await expect(validerCibleBddVide('postgres://u:p@h:5432/db', ['postgres://u:p@h:5432/db'])).rejects.toMatchObject({
      code: 'CIBLE_BDD_NON_VIDE',
    });
  });
});

// ── Upload target emptiness ──────────────────────────────────────────────
describe('validerCibleUploadVide', () => {
  it('accepte un dossier inexistant', () => {
    expect(() => validerCibleUploadVide(path.join(tmp, 'does-not-exist'))).not.toThrow();
  });

  it('accepte un dossier vide existant', () => {
    const dir = path.join(tmp, 'empty-upload');
    fs.mkdirSync(dir);
    expect(() => validerCibleUploadVide(dir)).not.toThrow();
  });

  it('rejette un dossier non vide', () => {
    const dir = path.join(tmp, 'nonempty-upload');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'existing.txt'), 'x');
    try {
      validerCibleUploadVide(dir);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('CIBLE_UPLOAD_NON_VIDE');
    }
  });
});

// ── Document extraction + file-count validation ──────────────────────────
describe('restaurerDocuments', () => {
  it('valide quand le nombre de fichiers extraits correspond au manifest', async () => {
    const target = path.join(tmp, 'upload-target-ok');
    state.extractFiles = [
      { rel: 'a.txt', content: 'a' },
      { rel: 'sub/b.txt', content: 'b' },
    ];
    const { nombreExtrait } = await restaurerDocuments('/fake/archive.tar.gz', target, 2);
    expect(nombreExtrait).toBe(2);
  });

  it('rejette quand le nombre de fichiers extraits diffère du manifest', async () => {
    const target = path.join(tmp, 'upload-target-mismatch');
    state.extractFiles = [{ rel: 'a.txt', content: 'a' }];
    await expect(restaurerDocuments('/fake/archive.tar.gz', target, 5)).rejects.toMatchObject({ code: 'NOMBRE_FICHIERS_INCOHERENT' });
  });
});

// ── psql restore invocation shape ────────────────────────────────────────
describe('restaurerBaseDeDonnees', () => {
  it('invoque psql avec ON_ERROR_STOP=1 et --single-transaction', async () => {
    await restaurerBaseDeDonnees('postgres://u:p@h:5432/db', '/fake/database.sql', ['postgres://u:p@h:5432/db']);
    expect(state.lastRestoreArgs).toContain('-v');
    expect(state.lastRestoreArgs).toContain('ON_ERROR_STOP=1');
    expect(state.lastRestoreArgs).toContain('--single-transaction');
    expect(state.lastRestoreArgs).toContain('-f');
    expect(state.lastRestoreArgs).toContain('/fake/database.sql');
  });
});

// ── Post-restore validation ──────────────────────────────────────────────
describe('validerPostRestauration', () => {
  it('valide les tables restaurées et la cohérence des chemins', async () => {
    const restoreDir = path.join(tmp, 'restore-target');
    fs.mkdirSync(path.join(restoreDir, 'missions'), { recursive: true });
    fs.writeFileSync(path.join(restoreDir, 'missions', 'a.pdf'), 'x');
    state.psqlChemins = '/sicot/documents/missions/a.pdf\n';

    const result = await validerPostRestauration('postgres://u:p@h:5432/db', ['postgres://u:p@h:5432/db'], '/sicot/documents', restoreDir);
    expect(result.tablesRestaurees).toEqual(['documents', 'parametres']);
    expect(result.documentChemins).toEqual({ total: 1, valides: 1, invalides: 0, invalidesEchantillon: [] });
  });

  it('signale un chemin dont le fichier restauré est absent', async () => {
    const restoreDir = path.join(tmp, 'restore-target-missing');
    fs.mkdirSync(restoreDir, { recursive: true });
    state.psqlChemins = '/sicot/documents/missions/missing.pdf\n';

    const result = await validerPostRestauration('postgres://u:p@h:5432/db', ['postgres://u:p@h:5432/db'], '/sicot/documents', restoreDir);
    expect(result.documentChemins.invalides).toBe(1);
  });
});

// ── CLI argument parsing / mode rules ─────────────────────────────────────
describe('parseArgs / validerArgs', () => {
  it('accepte un appel verify complet', () => {
    const args = validerArgs(
      parseArgs(['--backup-set', '/x', '--database-url', 'postgres://u:p@h/db', '--upload-dir', '/y', '--mode', 'verify'])
    );
    expect(args.mode).toBe('verify');
  });

  it('rejette verify avec des drapeaux destructifs', () => {
    expect(() =>
      validerArgs(
        parseArgs([
          '--backup-set', '/x', '--database-url', 'postgres://u:p@h/db', '--upload-dir', '/y',
          '--mode', 'verify', '--confirm-destructive',
        ])
      )
    ).toThrow(/verify/);
  });

  it('rejette disaster-recovery sans --confirm-destructive', () => {
    expect(() =>
      validerArgs(
        parseArgs([
          '--backup-set', '/x', '--database-url', 'postgres://u:p@h/db', '--upload-dir', '/y',
          '--mode', 'disaster-recovery', '--confirm-database-name', 'db',
        ])
      )
    ).toThrow(/confirm-destructive/);
  });

  it('rejette disaster-recovery sans --confirm-database-name', () => {
    expect(() =>
      validerArgs(
        parseArgs([
          '--backup-set', '/x', '--database-url', 'postgres://u:p@h/db', '--upload-dir', '/y',
          '--mode', 'disaster-recovery', '--confirm-destructive',
        ])
      )
    ).toThrow(/confirm-database-name/);
  });

  it('n\'accepte aucun repli implicite : les 3 arguments principaux sont requis', () => {
    expect(() => validerArgs(parseArgs(['--mode', 'verify']))).toThrow(/requis manquant/);
  });
});

// ── End-to-end confirm-database-name mismatch (executerRestauration) ─────
describe('executerRestauration - confirmation destructive', () => {
  it('rejette un --confirm-database-name ne correspondant pas à --database-url', async () => {
    const { dir } = creerJeuValide(tmp);
    const resultat = await executerRestauration({
      backupSet: dir,
      databaseUrl: 'postgres://u:p@h:5432/vraie_base',
      uploadDir: path.join(tmp, 'up'),
      mode: 'disaster-recovery',
      confirmDestructive: true,
      confirmDatabaseName: 'mauvais_nom',
    });
    expect(resultat.succes).toBe(false);
    expect(resultat.code).toBe('CONFIRMATION_NOM_BDD_INVALIDE');
  });
});

// ── Secret sanitization ───────────────────────────────────────────────────
describe('assainirTexte / sanitisation des secrets', () => {
  it('retire un secret littéral d\'un message', () => {
    const out = assainirTexte('connection failed: postgres://u:SUPER_SECRET_RESTORE_PASSWORD@host/db', [
      'postgres://u:SUPER_SECRET_RESTORE_PASSWORD@host/db',
    ]);
    expect(out).not.toContain('SUPER_SECRET_RESTORE_PASSWORD');
    expect(out).toContain('[REDACTED]');
  });

  it("executerRestauration n'expose jamais le mot de passe dans le résultat structuré, même sur échec psql", async () => {
    const { dir } = creerJeuValide(tmp, { fileCount: 1 });
    state.extractFiles = [{ rel: 'a.txt', content: 'x' }];
    const databaseUrl = 'postgres://sicot_user:SUPER_SECRET_RESTORE_PASSWORD@localhost:5432/sicot_test';
    state.psqlRestoreFail = `connection to server failed using "${databaseUrl}"`;

    const resultat = await executerRestauration({
      backupSet: dir,
      databaseUrl,
      uploadDir: path.join(tmp, 'up-secret-test'),
      mode: 'verify',
      confirmDestructive: false,
    });

    expect(resultat.succes).toBe(false);
    const serialise = JSON.stringify(resultat);
    expect(serialise).not.toContain('SUPER_SECRET_RESTORE_PASSWORD');
    expect(serialise).not.toContain(databaseUrl);
    expect(resultat.erreur).toContain('[REDACTED]');
  });

  it('analyserUrlBaseDeDonnees extrait le nom de base sans jamais nécessiter d\'afficher le mot de passe', () => {
    const info = analyserUrlBaseDeDonnees('postgres://u:SUPER_SECRET_RESTORE_PASSWORD@host:5432/ma_base');
    expect(info.dbName).toBe('ma_base');
    expect(info.password).toBe('SUPER_SECRET_RESTORE_PASSWORD');
  });
});

// ── Full happy-path orchestration (mocked child_process boundary only) ───
describe('executerRestauration - chemin nominal (verify)', () => {
  it('réussit de bout en bout avec un jeu conforme et une cible vide', async () => {
    const { dir } = creerJeuValide(tmp, { fileCount: 1 });
    const uploadDir = path.join(tmp, 'up-happy-path');
    state.extractFiles = [{ rel: 'missions/a.pdf', content: 'x' }];
    state.psqlEmptyCount = '0';
    state.psqlChemins = `${path.join(UPLOAD_DIR_DEFAUT, 'missions', 'a.pdf')}\n`;

    const resultat = await executerRestauration({
      backupSet: dir,
      databaseUrl: 'postgres://u:p@h:5432/db',
      uploadDir,
      mode: 'verify',
      confirmDestructive: false,
    });

    expect(resultat.succes).toBe(true);
    expect(resultat.validation.fichiersExtraits).toBe(1);
    expect(resultat.validation.documentChemins.valides).toBe(1);
  });
});

// ── documentChemins must gate overall success (mandatory correction) ─────
describe('executerRestauration - cohérence documents.chemin', () => {
  it('échoue avec failedStage post_restore_validation quand une ligne documents.chemin ne mappe à aucun fichier restauré', async () => {
    const { dir } = creerJeuValide(tmp, { fileCount: 1 });
    const uploadDir = path.join(tmp, 'up-broken-chemin');
    // L'archive extrait un fichier réel, mais la ligne documents.chemin
    // renvoyée par psql pointe vers un fichier qui n'a jamais été archivé -
    // reproduit une base restaurée dont les références ne correspondent pas
    // aux fichiers réellement restaurés (reprise incomplète/invalide).
    state.extractFiles = [{ rel: 'missions/a.pdf', content: 'x' }];
    state.psqlEmptyCount = '0';
    state.psqlChemins = `${path.join(UPLOAD_DIR_DEFAUT, 'missions', 'fichier-jamais-archive.pdf')}\n`;

    const resultat = await executerRestauration({
      backupSet: dir,
      databaseUrl: 'postgres://u:p@h:5432/db',
      uploadDir,
      mode: 'verify',
      confirmDestructive: false,
    });

    expect(resultat.succes).toBe(false);
    expect(resultat.failedStage).toBe('post_restore_validation');
    expect(resultat.code).toBe('VALIDATION_POST_RESTAURATION_ECHEC');
    // Le diagnostic (compte + échantillon plafonné) reste disponible même
    // en cas d'échec - ce n'est pas parce que succes=false que l'opérateur
    // doit perdre l'information de ce qui a été vérifié.
    expect(resultat.validation.documentChemins.total).toBe(1);
    expect(resultat.validation.documentChemins.valides).toBe(0);
    expect(resultat.validation.documentChemins.invalides).toBe(1);
    expect(resultat.validation.documentChemins.invalidesEchantillon).toHaveLength(1);
  });

  it('réussit toujours quand toutes les lignes documents.chemin correspondent (cas de succès préservé)', async () => {
    const { dir } = creerJeuValide(tmp, { fileCount: 1 });
    const uploadDir = path.join(tmp, 'up-ok-chemin');
    state.extractFiles = [{ rel: 'missions/a.pdf', content: 'x' }];
    state.psqlEmptyCount = '0';
    state.psqlChemins = `${path.join(UPLOAD_DIR_DEFAUT, 'missions', 'a.pdf')}\n`;

    const resultat = await executerRestauration({
      backupSet: dir,
      databaseUrl: 'postgres://u:p@h:5432/db',
      uploadDir,
      mode: 'verify',
      confirmDestructive: false,
    });

    expect(resultat.succes).toBe(true);
    expect(resultat.validation.documentChemins.invalides).toBe(0);
  });
});
