# Restore drill

How to actually restore a SICOT backup set (`database.sql` +
`documents.tar.gz` + `manifest.json`, see [backups.md](./backups.md)) using
`scripts/restore-backup.mjs`, and how to rehearse that procedure safely
before you ever need it for real. This is Phase 12.3B - it exists because
Phase 12.3A only proved backups are *written and checksummed*, not that
they are *restorable*. This document, the restore CLI, and the CI job
described below are what close that gap.

## What this is not

`scripts/restore-backup.mjs` is operator tooling invoked from a shell with
access to the API container/image. It is never exposed over HTTP, never
runs automatically, and never infers "the latest backup" or "the
production database" on its own. Every invocation names its backup set,
its target database, and its target upload directory explicitly.

It also never runs `DROP DATABASE`, `CREATE DATABASE`, or anything that
renames/deletes/replaces an existing upload directory. Those remain
operator-managed prerequisites - see below.

## Both modes require an empty target

The current dump format is `pg_dump --format=plain` with no `--clean`. It
contains `CREATE TABLE` statements and no `DROP` statements, so replaying
it against a database that already has the SICOT schema fails immediately
(relation already exists) rather than corrupting anything - but that also
means **restore only works into an empty database**.

This is true in **both** modes:

- **`verify` mode** requires an explicitly-supplied, empty (or
  freshly-created) scratch database, and an explicitly-supplied,
  nonexistent-or-empty upload directory. It never touches a database or
  directory that already has content, and it takes no destructive flags.
- **`disaster-recovery` mode** requires exactly the same emptiness, plus
  `--confirm-destructive` and `--confirm-database-name <exact db name>`.
  Those two flags acknowledge that this is a real recovery action - they do
  **not** unlock restoring onto a populated database. If the target
  database still has tables in it, disaster-recovery mode aborts with
  `CIBLE_BDD_NON_VIDE` exactly like verify mode does.

Practically, this means disaster recovery is a three-step operator
procedure, not a single command:

1. **Preserve** whatever you might still need from the current database and
   upload volume (snapshot, rename, or otherwise keep the old
   Docker-managed volume - this tool never touches it).
2. **Prepare an empty target**: drop and recreate the database yourself
   (`DROP DATABASE ...; CREATE DATABASE ...;` via `psql`, or your usual
   provisioning process), and point `--upload-dir` at a directory that does
   not exist yet or is empty (a fresh Docker named volume mount, for
   example).
3. **Invoke the CLI** against that prepared empty target.

The CLI never does step 1 or step 2 for you, on purpose: those are
irreversible, environment-specific decisions (which volume, whether to keep
a snapshot, how the production database is provisioned) that don't belong
in a generic script.

## CLI usage

```
node scripts/restore-backup.mjs \
  --backup-set /path/to/backup-quotidien-2026-09-10T12-21-02-fac842 \
  --database-url postgres://user:pass@host:5432/target_db \
  --upload-dir /path/to/empty/or/nonexistent/dir \
  --mode verify
```

```
node scripts/restore-backup.mjs \
  --backup-set /path/to/backup-quotidien-2026-09-10T12-21-02-fac842 \
  --database-url postgres://user:pass@host:5432/target_db \
  --upload-dir /path/to/empty/or/nonexistent/dir \
  --mode disaster-recovery \
  --confirm-destructive \
  --confirm-database-name target_db
```

All of `--backup-set`, `--database-url`, and `--upload-dir` are required in
both modes - there is no fallback to `DATABASE_URL`/`UPLOAD_DIR`
environment variables, no `--latest`, and no default tier. The operator
names the exact set and exact targets every time.

An optional `--original-upload-dir <path>` (default: `/sicot/documents`,
matching the application's own default - see
[configuration-reference.md](./configuration-reference.md)) tells the CLI
what `UPLOAD_DIR` was on the system that *produced* this backup, so it can
validate that `documents.chemin` rows in the restored database still point
at files that actually came back (see "Absolute `documents.chemin`
mapping" below). Set it explicitly if the backup was produced by a system
whose `UPLOAD_DIR` differed from the default.

Run this inside the API image/container (`docker compose exec api node
scripts/restore-backup.mjs ...`, or an equivalent `docker run` against the
built image) so Node, `psql`, `tar`, and the project's own code are
guaranteed to match what produced the backup - never from an ad hoc host
environment.

### Where restore runs in the sequence

1. Validate the backup-set directory (must exist, must not be
   `*.inprogress`).
2. Parse and validate `manifest.json` (exact `formatVersion`, exact
   filenames, well-formed sizes/SHA-256/`fileCount`, artifacts resolve
   inside the set directory and are regular files).
3. Verify artifact sizes and SHA-256 against the manifest.
4. Validate every archive entry (see "Archive safety" below) - read-only,
   nothing is extracted yet.
5. Validate the target database is empty.
6. Validate the target upload directory is nonexistent or empty.
7. **Extract documents.**
8. Validate the extracted regular-file count matches
   `manifest.documents.fileCount`.
9. **Restore the database** (`psql ... --single-transaction -f
   database.sql`).
10. Validate the restored database (responds, `documents`/`parametres`
    tables exist).
11. Validate `documents.chemin` rows against the restored files.
12. Emit one structured JSON result on stdout and exit 0/1.

Document extraction happens **before** database restore, deliberately: an
extracted file tree is trivial to discard and retry, while a database that
restored successfully followed by a failed document extraction is a much
harder state to leave an operator in. If document extraction fails, the
database is never touched. If the database restore fails,
`--single-transaction` rolls it back completely, but any already-extracted
files remain on disk - the result is still reported as a failure, and the
operator can clear the (explicitly-named, non-production-by-construction)
target and retry. This tool does not attempt automatic rollback across the
database/filesystem boundary - there is no simple, safe way to do that, and
a failed run always leaves a diagnosable, non-ambiguous state (a structured
result naming the exact `failedStage`).

## Manifest and integrity validation

Nothing in `manifest.json` is trusted blindly. Before any mutation, the CLI
checks: the set directory exists and isn't `*.inprogress`; the manifest is
valid JSON with `formatVersion === 1` (any other value is rejected outright
- there is no best-effort restore of an unrecognized format);
`backupId` matches the directory name; `tier` is one of the four valid
values; `database.filename`/`documents.filename` are exactly
`database.sql`/`documents.tar.gz`; sizes are non-negative integers;
SHA-256 fields are 64-character hex; `fileCount` is a non-negative integer;
and both artifacts resolve strictly inside the set directory as regular
files. Then, before touching anything, it re-stats both files and
recomputes their SHA-256 from disk (streaming, Node's own `crypto` -
nothing shells out to `sha256sum`) and aborts on any mismatch.

## Archive safety

`documents.tar.gz` is parsed and validated **before** extraction, using
`tar -tvzf` (never a blind `tar -xzf`). Every listed entry is checked
against BusyBox tar's actual verbose output format (empirically captured,
not guessed - see the Phase 12.3B implementation report for the exact
captured output): entries must be a regular file or a directory (leading
mode character `-` or `d`); no entry may carry a link annotation (`->`),
which rejects both symbolic links and hard links; no entry may be an
absolute path or contain a `..` segment; every resolved destination must
stay inside the target directory; and any listing line the parser cannot
confidently interpret causes the whole restore to abort rather than being
skipped or guessed at. After extraction, the CLI also walks the resulting
tree and re-confirms every file actually landed inside the target
directory, as a second, independent check.

SICOT's own backup process never produces symlinks, hardlinks, or
special files in `documents.tar.gz` (its source is `UPLOAD_DIR`, populated
only via `fs.writeFileSync` from uploaded document bytes) - so a set
containing any of those is, by construction, either corrupted or tampered,
and the correct response is outright rejection.

## `--single-transaction`

The database restore always runs as:

```
psql <database-url> --no-password -v ON_ERROR_STOP=1 --single-transaction -f database.sql
```

`-v ON_ERROR_STOP=1` makes `psql` abort on the first SQL error instead of
continuing past it. `--single-transaction` wraps the entire script in one
transaction, so an error partway through leaves the target database
exactly as empty as it started - never a half-restored schema. Both flags
together mean a restore either fully succeeds or leaves nothing behind to
clean up.

## Absolute `documents.chemin` mapping

`documents.chemin` stores an **absolute** path built at upload time
(`path.join(UPLOAD_DIR, category-subfolder, filename)` - see
`packages/server/src/modules/document/services/documents.constants.ts` /
`documents.service.ts`). Those rows are never rewritten by restore - doing
so would mutate restored data merely to make verification convenient.

Instead, for every row in `documents` (including soft-deleted ones - a
soft-deleted document's file is still archived and still restored, so its
row is still checked), the CLI strips the *original* `UPLOAD_DIR` prefix
(`--original-upload-dir`, see above) to get a relative path, then checks
whether that relative path exists under the actual `--upload-dir` used for
this restore. Any row whose `chemin` doesn't sit under the original prefix,
or whose corresponding file didn't come back, is reported as invalid - the
result's `validation.documentChemins` carries `total`/`valides`/`invalides`
counts plus a capped sample of invalid entries.

**Any `invalides > 0` fails the overall restore** (`succes: false`,
`failedStage: "post_restore_validation"`) - a database whose document rows
don't map to the files that actually came back is not a valid recovery,
even if the database restore and the file extraction each individually
"succeeded". The database and any extracted files are left exactly as they
landed (no automatic rollback - the database may already be fully
restored, and there is no safe cross-resource undo, see "Restore mutation
order" above); the `validation.documentChemins` block still carries the
full diagnostic (counts + capped sample) so the operator can tell exactly
which rows are wrong; a wrong `--original-upload-dir` is the most likely
cause and will show up as most/all rows being invalid.

## Secrets

The restore CLI never prints `--database-url` (credentials included). Every
error that could originate from `psql`/`child_process` - including a raw
`execFile` failure, which can otherwise carry the full connection string in
its `.cmd`/`.message` - is passed through a sanitizer that strips the exact
URL (and its parsed-out password) before it can reach stdout, stderr, or
the structured JSON result.

## PostgreSQL client/server version contract

**Invariant: the API image's `pg_dump`/`psql` major version is pinned to
match the production PostgreSQL server's major version.** This is not
advisory - it is required for a backup to be restorable at all with the
current dump format.

Alpine's unversioned `postgresql-client` meta-package tracks whatever major
is currently latest in Alpine's package index, independent of what
PostgreSQL major the project actually runs. During Phase 12.3B this was
caught for real: with `postgresql-client` unpinned, the image installed
`pg_dump`/`psql` **18.6** while every `docker-compose*.yml` declares
`postgres:16` - a dump produced that way includes `SET transaction_timeout
= 0;` (a GUC introduced in PostgreSQL 17) and PostgreSQL 16 rejects it
outright on restore (`unrecognized configuration parameter
"transaction_timeout"`), caught safely by `ON_ERROR_STOP=1` before any
partial restore, but a real failure. Fixed by pinning
`packages/server/Dockerfile` to `postgresql16-client` explicitly (both the
`base` and `prod` stages) - Alpine ships a matching `postgresql16-client`
package (`apk search postgresql16`), so no non-standard repository or
manual package build was needed.

**Two layers protect this invariant going forward:**

1. `npm run verify:backup-client-version`
   (`scripts/verify-backup-client-version.mjs`), part of the fast CI
   `verify` job. Purely static - it reads the Dockerfile's pinned
   `postgresql<N>-client` package name and every `docker-compose*.yml`'s
   `postgres:<N>` image tag as text, and fails if any major doesn't match.
   No Docker build, no image inspection - this is a text-level fact, and
   keeping the check static keeps it fast enough for every push/PR.
2. The `restore-verify` CI job's real Postgres round trip (see below) -
   it would have caught the *restore-side* symptom (a real restore
   failure) had it been running against a client/server pair that actually
   diverged, but on its own it can't *prove absence* of a future mismatch
   the way the static check does; the two are complementary, not redundant.

**Operational check, as part of any real restore (not just automated):**
run `pg_dump --version`, `psql --version` (inside the API
image/container), and `SELECT version();` (or `SHOW server_version;`)
against the actual target server, and confirm the major versions match,
before trusting a backup set to be restorable there.

`--no-owner`/`--no-privileges` remain a separate, still-deferred future
portability/hardening item (unrelated to this version contract) - see
Limitations below.

## CI synthetic restore guarantee

A dedicated CI job, `restore-verify` (separate from the fast `verify` job),
runs `scripts/verify-backup-restore.mjs` against a real, disposable
`postgres:16` GitHub Actions service on every push/PR. It seeds a
distinctive synthetic marker row and a synthetic upload file, runs the real
compiled backup job (`effectuerSauvegardeTier`), creates a second empty
database on the same disposable server, invokes `scripts/restore-backup.mjs`
as an external process exactly as an operator would, and then
independently re-queries the restored database and re-reads the restored
file to confirm they match - it does not just trust the CLI's own
`succes: true`. It uses only data it created itself and cleans up only that
data (the disposable database it created, the synthetic rows it inserted,
its own scratch directories) - never a broad `docker volume prune` /
`docker system prune` equivalent. See the Phase 12.3B implementation report
for the real run this was validated against before being wired into CI.

## Manual restore drill (recommended cadence: before relying on this in a
real incident, and periodically thereafter)

1. Pick a known-good, completed backup set (not `*.inprogress`).
2. Copy it (or work directly against the original - it's read-only from the
   CLI's perspective) into an isolated environment.
3. Start a disposable PostgreSQL instance, named distinctly for this drill
   (e.g. `sicot-restore-drill-<date>-pg`), with disposable credentials.
4. Create a scratch upload directory, likewise named distinctly for this
   drill.
5. Run `scripts/restore-backup.mjs --mode verify` against that disposable
   database and scratch directory.
6. Inspect the structured result: `succes: true`, the `validation` block's
   file counts and `documentChemins` counts look right for what you expect
   from that set.
7. **Destroy only the resources you created for this drill by name** - the
   disposable Postgres container/volume, the scratch directory. Never run a
   broad `docker volume prune` / `docker system prune` as part of this
   procedure - that can destroy unrelated volumes on a shared host.
8. Record the date, operator, backup set used, and result somewhere durable
   (an incident log, a ticket, whatever your team already uses - this repo
   does not prescribe a specific tracker).

## Limitations

- **`--no-owner`/`--no-privileges` are not passed to `pg_dump`.** The dump
  still emits ownership/`GRANT` statements for the dump-time role. Restore
  currently assumes the connecting role at restore time is the same as (or
  otherwise compatible with) the role that produced the dump. This is
  unrelated to the version contract above (which is fixed and enforced -
  see "PostgreSQL client/server version contract") and remains a distinct,
  still-deferred future dump-format hardening item.
- Only `verify` mode has a fully-automated, CI-proven round trip. Disaster-
  recovery mode's *additional* flags (`--confirm-destructive`,
  `--confirm-database-name`) are covered by focused tests, but running
  disaster-recovery mode against a real production-shaped target has not
  been drilled end-to-end by this phase - do that manually (see above)
  before you need it for real.
- No restore history is recorded anywhere (no database table, no
  `job_executions` row) - this is deliberate: restore is operator tooling,
  not an application job. Whatever evidence trail you need from a real
  restore comes from the structured JSON result and wherever you record
  drill outcomes (see step 8 above).
- No email/Slack/other failure notification exists for restore - same as
  backups (see [backups.md](./backups.md)), this is a known, separate gap.
- Restore has no maintenance-mode/traffic-cutover behavior - it assumes the
  operator has already ensured nothing else is writing to the target
  database/upload directory during the restore.
