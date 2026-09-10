// Phase 12.3A - focused tests for complete backup-set creation.
//
// The child-process boundary (pg_dump / tar) is mocked so no real Postgres
// or shell tooling is needed; everything else runs for real against
// temporary directories: the .inprogress -> final rename, manifest writing,
// SHA-256 computation (Node crypto, on the actual bytes the mock wrote),
// retention directory pruning, and the in-process mutex. Nothing that this
// slice is responsible for is mocked away.
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const BASE = fs.mkdtempSync(path.join(os.tmpdir(), 'sicot-backup-test-'));

// Shared, hoisted so the vi.mock factories can read it.
const state = vi.hoisted(() => ({
  localRoot: '',
  uploadDir: '',
  failStage: null as null | 'pg_dump' | 'tar',
  tarEntries: './\n./a.pdf\n./sub/\n./sub/b.txt\n', // 2 files, 2 dir entries
}));

// UPLOAD_DIR is read as a module-level const in documents.constants at
// import time - fix it to a stable path and recreate that dir per test.
process.env.UPLOAD_DIR = path.join(BASE, 'uploads');
state.uploadDir = path.join(BASE, 'uploads');
// Value is irrelevant - the mocked pg_dump ignores it; backup.ts only
// guards that it is set.
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

vi.mock('@/modules/auth/services/auth.service', () => ({
  logAudit: vi.fn(async () => {}),
}));
vi.mock('@/modules/jobs/services/job-executions.service.js', () => ({
  enregistrerExecutionJob: vi.fn(async () => {}),
  listerExecutionsJobs: vi.fn(),
}));
vi.mock('@/modules/parametres/services/parametres.service.js', () => ({
  getValeurTexte: vi.fn(async (_cle: string, _defaut: string) => state.localRoot),
  getValeurEntier: vi.fn(async (_cle: string, defaut: number) => defaut),
}));

vi.mock('child_process', async () => {
  const realUtil = await import('util');
  const nodeFs = await import('fs');
  const nodeZlib = await import('zlib');

  const impl = (
    file: string,
    args: string[],
    cb: (e: Error | null, stdout?: string, stderr?: string) => void
  ) => {
    try {
      if (file === 'pg_dump' || file.endsWith('pg_dump')) {
        if (state.failStage === 'pg_dump') throw new Error('pg_dump: simulated failure');
        const i = args.indexOf('-f');
        // > TAILLE_MIN_DUMP_OCTETS (1024)
        nodeFs.writeFileSync(args[i + 1], 'CREATE TABLE t (id int);\n'.repeat(200));
        return cb(null, '', '');
      }
      if (file === 'tar' || file.endsWith('tar')) {
        if (args[0] === '-czf') {
          if (state.failStage === 'tar') throw new Error('tar: simulated failure');
          // Real gzip bytes so the downstream non-empty check and SHA-256
          // run against genuine content.
          nodeFs.writeFileSync(args[1], nodeZlib.gzipSync(Buffer.from('fake-archive-bytes')));
          return cb(null, '', '');
        }
        if (args[0] === '-tzf') {
          return cb(null, state.tarEntries, '');
        }
      }
      return cb(new Error(`unexpected execFile call: ${file} ${args.join(' ')}`));
    } catch (e) {
      return cb(e as Error);
    }
  };

  (impl as unknown as Record<symbol, unknown>)[realUtil.promisify.custom] = (
    file: string,
    args: string[]
  ) =>
    new Promise((resolve, reject) =>
      impl(file, args, (e, stdout, stderr) =>
        e ? reject(e) : resolve({ stdout, stderr })
      )
    );

  return { execFile: impl };
});

// Imported after the mocks are registered.
const {
  effectuerSauvegardeTier,
  prunerJeux,
  synchroniserVersNas,
} = await import('./backup');

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

let localRoot: string;

beforeEach(() => {
  localRoot = fs.mkdtempSync(path.join(BASE, 'local-'));
  state.localRoot = localRoot;
  state.failStage = null;
  fs.rmSync(state.uploadDir, { recursive: true, force: true });
  fs.mkdirSync(state.uploadDir, { recursive: true });
  fs.writeFileSync(path.join(state.uploadDir, 'a.pdf'), 'pdf');
  delete process.env.BACKUP_NAS_DIR;
});

afterEach(() => {
  fs.rmSync(localRoot, { recursive: true, force: true });
});

afterAll(() => {
  fs.rmSync(BASE, { recursive: true, force: true });
});

describe('backup - successful set', () => {
  it('produces database.sql, documents.tar.gz and manifest.json in a completed (non-.inprogress) directory', async () => {
    const r = await effectuerSauvegardeTier('quotidien');

    expect(r.succesGlobal).toBe(true);
    expect(r.local.succes).toBe(true);
    const dir = r.local.cheminFinal!;
    expect(dir.endsWith('.inprogress')).toBe(false);
    expect(fs.existsSync(path.join(dir, 'database.sql'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'documents.tar.gz'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'manifest.json'))).toBe(true);
    // no leftover .inprogress sibling
    const tierDir = path.dirname(dir);
    expect(fs.readdirSync(tierDir).filter((n) => n.endsWith('.inprogress'))).toEqual([]);
  });

  it('manifest checksums and sizes match the generated files', async () => {
    const r = await effectuerSauvegardeTier('quotidien');
    const dir = r.local.cheminFinal!;
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

    expect(manifest.formatVersion).toBe(1);
    expect(manifest.backupId).toBe(r.local.setId);
    expect(manifest.tier).toBe('quotidien');

    expect(manifest.database.sha256).toBe(sha256(path.join(dir, 'database.sql')));
    expect(manifest.database.sizeBytes).toBe(fs.statSync(path.join(dir, 'database.sql')).size);
    expect(manifest.documents.sha256).toBe(sha256(path.join(dir, 'documents.tar.gz')));
    expect(manifest.documents.sizeBytes).toBe(
      fs.statSync(path.join(dir, 'documents.tar.gz')).size
    );
    // 2 file entries in the mocked `tar -tzf` listing (dir entries excluded)
    expect(manifest.documents.fileCount).toBe(2);
  });

  it('manifest contains no secrets', async () => {
    const r = await effectuerSauvegardeTier('quotidien');
    const raw = fs.readFileSync(path.join(r.local.cheminFinal!, 'manifest.json'), 'utf8');
    expect(raw).not.toMatch(/DATABASE_URL|postgres:\/\/|SMTP|password|apikey|api_key/i);
    expect(raw).not.toContain('localStatus');
    expect(raw).not.toContain('nasReplicationStatus');
  });

  it('an empty UPLOAD_DIR still yields a valid completed set', async () => {
    fs.rmSync(state.uploadDir, { recursive: true, force: true });
    fs.mkdirSync(state.uploadDir, { recursive: true });
    state.tarEntries = './\n'; // only the root entry -> 0 files

    const r = await effectuerSauvegardeTier('quotidien');
    expect(r.local.succes).toBe(true);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(r.local.cheminFinal!, 'manifest.json'), 'utf8')
    );
    expect(manifest.documents.fileCount).toBe(0);

    state.tarEntries = './\n./a.pdf\n./sub/\n./sub/b.txt\n';
  });
});

describe('backup - failed artifact creation', () => {
  it('pg_dump failure: no final dir, no leftover .inprogress, failure stage reported', async () => {
    state.failStage = 'pg_dump';
    const r = await effectuerSauvegardeTier('quotidien');

    expect(r.succesGlobal).toBe(false);
    expect(r.local.succes).toBe(false);
    expect(r.local.etapeEchec).toBe('pg_dump');
    const tierDir = path.join(localRoot, 'quotidien');
    const entries = fs.existsSync(tierDir) ? fs.readdirSync(tierDir) : [];
    expect(entries).toEqual([]); // neither a final set nor an .inprogress dir
  });

  it('tar failure: .inprogress is cleaned up and no final set exists', async () => {
    state.failStage = 'tar';
    const r = await effectuerSauvegardeTier('quotidien');

    expect(r.local.succes).toBe(false);
    expect(r.local.etapeEchec).toBe('archive');
    const tierDir = path.join(localRoot, 'quotidien');
    const entries = fs.existsSync(tierDir) ? fs.readdirSync(tierDir) : [];
    expect(entries).toEqual([]);
  });
});

describe('backup - retention on whole sets', () => {
  it('prunes entire old backup-set directories, keeping the most recent N', () => {
    const tierDir = path.join(localRoot, 'quotidien');
    fs.mkdirSync(tierDir, { recursive: true });
    const names = [
      'backup-quotidien-2026-01-01T00-00-00',
      'backup-quotidien-2026-01-02T00-00-00',
      'backup-quotidien-2026-01-03T00-00-00',
      'backup-quotidien-2026-01-04T00-00-00',
    ];
    names.forEach((n, i) => {
      const d = path.join(tierDir, n);
      fs.mkdirSync(d);
      fs.writeFileSync(path.join(d, 'database.sql'), 'x');
      fs.writeFileSync(path.join(d, 'documents.tar.gz'), 'x');
      // stagger mtimes so ordering is deterministic
      const t = new Date(2026, 0, i + 1);
      fs.utimesSync(d, t, t);
    });

    const removed = prunerJeux(localRoot, 'quotidien', 2);

    expect(removed.sort()).toEqual(names.slice(0, 2).sort());
    const left = fs.readdirSync(tierDir).sort();
    expect(left).toEqual(names.slice(2).sort());
    // whole directories gone, not just one artifact
    expect(fs.existsSync(path.join(tierDir, names[0]))).toBe(false);
  });

  it('ignores *.inprogress directories when counting/pruning', () => {
    const tierDir = path.join(localRoot, 'quotidien');
    fs.mkdirSync(tierDir, { recursive: true });
    const completed = [
      'backup-quotidien-2026-02-01T00-00-00',
      'backup-quotidien-2026-02-02T00-00-00',
    ];
    completed.forEach((n, i) => {
      const d = path.join(tierDir, n);
      fs.mkdirSync(d);
      const t = new Date(2026, 1, i + 1);
      fs.utimesSync(d, t, t);
    });
    const inProgress = path.join(tierDir, 'backup-quotidien-2026-02-03T00-00-00.inprogress');
    fs.mkdirSync(inProgress);

    const removed = prunerJeux(localRoot, 'quotidien', 5); // keep more than exist

    expect(removed).toEqual([]);
    expect(fs.existsSync(inProgress)).toBe(true); // never touched
  });
});

describe('backup - in-process mutex', () => {
  it('rejects a concurrent second run with SAUVEGARDE_DEJA_EN_COURS', async () => {
    const first = effectuerSauvegardeTier('quotidien');
    const second = effectuerSauvegardeTier('quotidien');

    await expect(second).rejects.toThrow('SAUVEGARDE_DEJA_EN_COURS');
    await expect(first).resolves.toMatchObject({ succesGlobal: true });

    // lock released afterwards
    await expect(effectuerSauvegardeTier('quotidien')).resolves.toMatchObject({
      succesGlobal: true,
    });
  });
});

describe('backup - NAS replication', () => {
  it('replication failure does not invalidate or delete the completed local set', async () => {
    // Point BACKUP_NAS_DIR at a *file*, so the "is a directory" guard fails
    // and replication reports unavailable - the local set must remain intact.
    const notADir = path.join(BASE, 'nas-not-a-dir');
    fs.writeFileSync(notADir, 'x');
    process.env.BACKUP_NAS_DIR = notADir;

    const r = await effectuerSauvegardeTier('quotidien');

    expect(r.local.succes).toBe(true);
    expect(r.succesGlobal).toBe(true); // NAS never affects success
    expect(r.nas.statut).toBe('indisponible');
    expect(fs.existsSync(path.join(r.local.cheminFinal!, 'manifest.json'))).toBe(true);
  });

  it('BACKUP_NAS_DIR explicitly empty reports non_configure, local set still completes', async () => {
    process.env.BACKUP_NAS_DIR = '';
    const r = await effectuerSauvegardeTier('quotidien');
    expect(r.local.succes).toBe(true);
    expect(r.nas.statut).toBe('non_configure');
  });

  it('BACKUP_NAS_DIR pointing at a non-existent path reports indisponible', async () => {
    process.env.BACKUP_NAS_DIR = path.join(BASE, 'nas-does-not-exist-xyz');
    const r = await effectuerSauvegardeTier('quotidien');
    expect(r.local.succes).toBe(true);
    expect(r.nas.statut).toBe('indisponible');
  });

  it('a real NAS directory receives a byte-identical copy of the set', async () => {
    const nasRoot = fs.mkdtempSync(path.join(BASE, 'nas-'));
    process.env.BACKUP_NAS_DIR = nasRoot;

    const r = await effectuerSauvegardeTier('quotidien');
    expect(r.nas.statut).toBe('ok');

    const localDir = r.local.cheminFinal!;
    const nasDir = path.join(nasRoot, 'quotidien', r.local.setId);
    for (const f of ['database.sql', 'documents.tar.gz', 'manifest.json']) {
      expect(sha256(path.join(nasDir, f))).toBe(sha256(path.join(localDir, f)));
    }
  });

  it('synchroniserVersNas copies completed-but-missing sets and skips .inprogress', async () => {
    const nasRoot = fs.mkdtempSync(path.join(BASE, 'nas-'));
    process.env.BACKUP_NAS_DIR = nasRoot;

    // one completed local set, one .inprogress
    const tierDir = path.join(localRoot, 'quotidien');
    fs.mkdirSync(tierDir, { recursive: true });
    const done = path.join(tierDir, 'backup-quotidien-2026-03-01T00-00-00');
    fs.mkdirSync(done);
    fs.writeFileSync(path.join(done, 'manifest.json'), '{}');
    fs.mkdirSync(path.join(tierDir, 'backup-quotidien-2026-03-02T00-00-00.inprogress'));

    const res = await synchroniserVersNas();

    expect(res.copies).toEqual(['quotidien/backup-quotidien-2026-03-01T00-00-00']);
    expect(
      fs.existsSync(path.join(nasRoot, 'quotidien', 'backup-quotidien-2026-03-01T00-00-00'))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(nasRoot, 'quotidien', 'backup-quotidien-2026-03-02T00-00-00.inprogress')
      )
    ).toBe(false);
  });
});
