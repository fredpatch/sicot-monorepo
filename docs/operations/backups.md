# Backups

What backup mechanisms exist today, and - just as importantly - what
remains unvalidated. This document is deliberately conservative: it states
only what the repository proves, and does not describe restore as tested
unless it is. **Restore tooling exists and is CI-validated against a real,
disposable PostgreSQL with synthetic data - see [Restore status](#restore-status)
and [restore-drill.md](./restore-drill.md) for what that does and does not cover.**

Scheduling mechanics (cron cadence, manual-execution endpoint, execution
history) are shared with the rest of the job system - see
[scheduled-jobs.md](./scheduled-jobs.md); this document covers backup
content, destinations, retention, and restore status only.

## What is backed up

As of Phase 12.3A, a backup run produces a **complete backup set**: one
timestamped directory per tier containing all three of:

| Artifact | Content |
|---|---|
| `database.sql` | Full `pg_dump` of the PostgreSQL database, plain-format SQL (`--format=plain`). Invoked via `execFile` with an argument array - no shell string is constructed. |
| `documents.tar.gz` | gzip archive of the entire `UPLOAD_DIR` tree (all uploaded document bytes, every category), produced with the system `tar` via `execFile`. An empty `UPLOAD_DIR` still yields a valid archive. |
| `manifest.json` | Operational metadata only (see below). Written **last**, only after both artifacts exist and have been checksummed. |

`packages/server/src/jobs/backup.ts` orchestrates this. The API image
(`packages/server/Dockerfile`) installs `postgresql16-client` (`pg_dump` /
`psql`) - pinned to major 16 to match the production PostgreSQL server (see
[restore-drill.md](./restore-drill.md#postgresql-clientserver-version-contract)
for why that pin is load-bearing, not cosmetic); `tar` and `gzip` are
already present in the base image.

### Consistency ordering

The database is dumped **before** the document archive, deliberately:

1. in-progress set directory created
2. `pg_dump` → `database.sql`
3. `tar` → `documents.tar.gz`
4. SHA-256 of both artifacts
5. `manifest.json`
6. atomic rename to the completed set name
7. replicate the completed set to NAS

If an upload happens between steps 2 and 3, the worst outcome is one extra
unreferenced file inside the archive. The opposite order could produce a
database dump referencing a document row whose bytes the earlier archive
missed. This small window is accepted for the current single-instance
architecture rather than introducing a maintenance-mode / write-lock
mechanism.

### Manifest contents

`formatVersion`, `backupId`, `tier`, `createdAt`, and per-artifact
`filename` / `sizeBytes` / `sha256` (plus `fileCount` for the document
archive), and `applicationVersion` (`APP_VERSION` if set at runtime, else
`null`).

The manifest contains **no** secrets and **no** location/status data - no
`DATABASE_URL`, credentials, SMTP details, API keys, or NAS hostname, and
no local/NAS success flags. It describes the backup set itself, not where
copies of it currently live. Local/NAS status is reported separately (job
history + audit log), not in the manifest.

## Where backups go

**Local is canonical; NAS is replication.** One verified local backup set
is created first, then copied byte-for-byte to NAS. NAS never runs its own
`pg_dump` or rebuilds the archive - it receives an exact copy of the local
set.

- **Local** - directory from the DB-editable parameter `backup_local_dir`
  (admin-editable via the Settings screen), falling back to the
  `BACKUP_LOCAL_DIR` environment variable. In production this is the
  `sicot_backups_prod` volume mounted at `/sicot/backups/local` on `api`.
  **Dev and staging have no equivalent backup volume** - local sets there
  live in the container's ephemeral filesystem and do not survive a
  container recreate.
- **NAS** - directory from `BACKUP_NAS_DIR` (environment only, not
  admin-editable). The backup job **never creates the NAS root itself** -
  an auto-created directory at that path would not prove the network share
  is actually mounted. NAS replication status is reported as one of:
  `ok`, `echec`, `non_configure` (`BACKUP_NAS_DIR` unset), or
  `indisponible` (set, but the root directory does not exist). No NAS
  volume/bind-mount is defined in any Compose file in this repository -
  whether one is provided at the host/Docker-daemon level is an
  operational detail outside this repo.

**A NAS replication failure never invalidates or deletes a completed local
backup set.** Local success and NAS replication success/failure are
reported as distinct facts in the job history and audit log.

Each destination is organized into per-tier subfolders: `quotidien/`,
`hebdomadaire/`, `mensuel/`, `annuel/`, each containing
`backup-<tier>-<timestamp>-<rand>/` set directories.

## Atomic completion

A set is generated inside a sibling `*.inprogress` directory. It only
receives its final (completed) name via an atomic rename after all three
artifacts are produced and validated. On **any** failure before that
rename, the `*.inprogress` directory is removed and the job result records
the exact `failedStage` (`pg_dump`, `archive`, `checksum`, `manifest`,
`finalisation`). A partially-created set never looks restorable.

Post-completion failures - NAS replication, retention cleanup, audit
logging - do **not** delete or invalidate the completed local set.

## Retention strategy

Grandfather-father-son rotation, unchanged in policy - only the unit
changed, from an individual `.sql` file to a **complete backup-set
directory**. Retention deletes whole set directories and never removes just
one artifact from a set. `*.inprogress` directories are ignored when
counting/pruning.

| Tier | Kept | Pruned when |
|---|---|---|
| Daily | most recent N (default 7; admin-editable DB parameter) | A weekly promotion succeeds |
| Weekly | most recent N (default 5; admin-editable) | A monthly promotion succeeds |
| Monthly | most recent N (default 12; admin-editable) | A yearly promotion succeeds |
| Yearly | kept indefinitely - never pruned | never |

## In-process concurrency guard

The backup job has a module-level mutex. Within a single API process, a
manual backup that would overlap the scheduled cycle (or another manual
run) is rejected immediately with `SAUVEGARDE_DEJA_EN_COURS` rather than
running concurrently. This is **not** a distributed lock - the
multiple-replica case (see [scheduled-jobs.md](./scheduled-jobs.md)) is
unaffected and remains a separate, latent issue.

## How jobs are triggered

- **Scheduled:** a single daily cron (`0 0 * * *`) always runs the daily
  set; the same run additionally promotes to weekly/monthly/yearly tiers
  on Sundays / month-end / year-end respectively.
- **Manual:** `POST /api/jobs/:cle/executer` for `backup_quotidien`,
  `backup_hebdomadaire`, `backup_mensuel`, `backup_annuel`, and
  `backup_sync_nas` (catch-up copy of completed local sets missing on the
  NAS) - all gated behind `SYSTEM_ADMIN_OPERATION` (super_admin only).

## What success/failure evidence exists

Every run writes a row to `job_executions` (human-readable `resume` +
`erreur`) and an entry to `audit_logs` whose `details` (JSONB) carries
structured metadata: `backupSetId`, `tier`, `localStatus`,
`nasReplicationStatus`, `databaseSizeBytes`, `archiveSizeBytes`,
`fileCount`, `durationMs`, and `failedStage` where applicable. No schema
migration was added for this - it reuses the existing audit-log details
channel.

**There is still no failure notification.** No email/Slack/other alert
fires on backup failure - it is visible only by checking job history, the
audit log, or container stdout. This remains a real observability gap - see
[monitoring-and-health.md](./monitoring-and-health.md).

## Restore status

**Restore tooling exists (`scripts/restore-backup.mjs`, Phase 12.3B) and is
proven against a real, disposable PostgreSQL server in CI**, using
synthetic data only (a dedicated `restore-verify` job runs the real backup
job, then the real restore CLI as an external process, then independently
re-verifies the restored marker row and restored file). Full usage,
safety rules, and limitations live in
[restore-drill.md](./restore-drill.md) - in particular:

- both restore modes (`verify` and `disaster-recovery`) require an empty
  target database and an empty/nonexistent target upload directory (the
  current plain-format dump has no `--clean` and cannot be layered onto an
  existing schema);
- the CLI never runs `DROP DATABASE`/`CREATE DATABASE` and never
  renames/deletes an existing upload directory - preparing the target
  remains an explicit operator step;
- a real `pg_dump`/PostgreSQL-server major-version mismatch was found
  during implementation (an unpinned client package resolved to a newer
  major than the declared production server, producing a dump the server
  couldn't restore) and is now fixed and guarded: the API image pins
  `postgresql16-client` to match the declared production server, and a
  static CI check (`verify:backup-client-version`) fails the build if that
  pin and any `docker-compose*.yml`'s declared PostgreSQL major ever
  diverge again - see
  [restore-drill.md](./restore-drill.md#postgresql-clientserver-version-contract);
- **a restore fails outright if any restored `documents.chemin` row doesn't
  map to an actually-restored file** (`documentChemins.invalides > 0` ->
  `succes: false`, `failedStage: "post_restore_validation"`) - a database
  whose document references don't match its files is never reported as a
  successful recovery;
- disaster-recovery mode itself has not been drilled end-to-end against a
  production-shaped target - only `verify` mode has a fully automated,
  CI-proven round trip.

## Security

Backup sets contain sensitive data: the database dump includes password
hashes and all business content, and `documents.tar.gz` contains the raw
uploaded files. Protection today is whatever the OS/Docker-volume
filesystem permissions on the local backup directory (and any NAS share)
provide - there is no archive-level encryption. Introducing encryption at
rest is explicitly deferred (future hardening), not part of 12.3A.

No NAS credentials, SSH keys, database passwords, or private hostnames
appear in backup code, manifests, or this document - only environment
variable names and conceptual destinations.

## Still open after 12.3B

1. **Disaster-recovery mode is not end-to-end drilled** - only `verify`
   mode has a CI-proven real-Postgres round trip.
2. **`--no-owner`/`--no-privileges` are not passed to `pg_dump`** - restore
   currently assumes the dump-time and restore-time roles are compatible;
   a separate, still-deferred dump-format hardening item (unrelated to the
   client/server major-version contract, which is fixed and CI-guarded).
3. **No failure notification** - a failed backup or restore is only
   discoverable by actively checking job history / audit logs / CI.
4. **Dev and staging have no persistent backup volume** - low impact (not
   systems of record), noted for anyone using them to exercise the backup
   mechanism itself.
5. **NAS mount is not defined in any Compose file** - if no host-level
   mount is provided operationally, NAS replication reports `indisponible`
   and only the local set exists.
6. **Archive-level encryption at rest** - deferred future hardening.
