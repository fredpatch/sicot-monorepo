# Jobs & Backups

Full scheduler and backup model: [../operations/scheduled-jobs.md](../operations/scheduled-jobs.md)
and [../operations/backups.md](../operations/backups.md). This document
covers diagnosis only.

**Two facts to keep in mind for every symptom below:**
- The scheduler is **in-process** - jobs run only while the API process is
  alive. A process restart re-registers every schedule from scratch; a
  missed tick during downtime is not queued or replayed.
- **No distributed lock exists.** If more than one API replica were ever
  run, every replica would independently fire the same schedules,
  producing duplicate runs. Today this isn't active (a single replica runs
  by default), but it is a real, currently-latent risk. Note: the backup
  job additionally has an **in-process** mutex (Phase 12.3A) - within a
  single process, a manual backup that overlaps the scheduled cycle (or
  another manual run) is rejected with `SAUVEGARDE_DEJA_EN_COURS` rather
  than running concurrently. This does not address the multi-replica case.

## Symptom: a job isn't running on its schedule

### Likely causes
- The API process was down at the scheduled time - nothing catches this up
  automatically.
- The job in question has no dedicated cron trigger at all - `courriers_criticite`
  and `recommandations_retard` are registry-only entries with no automatic
  schedule; they only run when manually triggered. Confirm which category a
  given job falls into before assuming a schedule is broken - see the job
  table in [../operations/scheduled-jobs.md](../operations/scheduled-jobs.md#registered-jobs).

### Checks
```bash
# Was the API process actually running at the expected time?
docker compose logs api | grep -i "démarrée sur"

# Check execution history for that job
curl -s "http://localhost:3001/api/jobs/historique?jobCle=<cle>" \
  -H "Cookie: sicot_access=<...>"   # requires an authenticated session with JOB_EXECUTE
```

### Safe corrective actions
If the process was down at the scheduled time, trigger the job manually
via `POST /api/jobs/:cle/executer` (see
[../api/endpoints/administration/jobs.md](../api/endpoints/administration/jobs.md))
rather than waiting for the next scheduled tick, if the delay matters
operationally.

### Escalate when
The API process was confirmed running continuously through the expected
schedule time, and the job still didn't fire - this needs code-level
investigation, not configuration.

---

## Symptom: manual job execution fails

### Likely causes
- `403 ROLE_INSUFFISANT` - the caller lacks that specific job's required
  capability. Most jobs need `JOB_EXECUTE`; every backup-related job
  additionally requires `SYSTEM_ADMIN_OPERATION` (super_admin only) - a
  stricter, per-job check on top of the route-level guard.
- `404 JOB_INTROUVABLE` - wrong job key.
- `502` - the job ran but failed internally (a deliberate structured
  failure response, not a transport error) - check the response body's
  `resume`/`details` for the actual cause.

### Checks
Read the response status and body carefully - `403`, `404`, and `502` mean
three very different things here and point at different fixes.

### Safe corrective actions
For `403` on a backup job specifically, confirm the caller actually holds
`SYSTEM_ADMIN_OPERATION`, not just `JOB_EXECUTE` - this is a deliberately
stricter, additional check. For `502`, treat the response body as the
actual error to investigate, not the HTTP status.

### Escalate when
The correct capability is confirmed held, the job key is confirmed
correct, and execution still fails without a clear cause in the response
body.

---

## Symptom: no job history / history is empty

### Likely causes
- Querying the wrong `jobCle` filter.
- The job has genuinely never run yet in this environment (fresh
  install/database).

### Checks
```bash
curl -s "http://localhost:3001/api/jobs/historique" -H "Cookie: sicot_access=<...>"
```
Query without filters first to confirm the table has any rows at all in
this environment.

### Safe corrective actions
None needed if the environment is simply new. If rows are expected but
absent, confirm the job actually ran (see boot logs) rather than assuming
the history table itself is broken - every scheduled and manual run writes
a row regardless of success/failure.

### Escalate when
A job is confirmed to have run (via logs) but produced no history row -
this points at a bug in the history-recording path itself.

---

## Symptom: API restart missed a scheduled run

### Likely causes
This is expected behavior given the in-process scheduler model - not a
bug. See the two facts at the top of this document.

### Checks
Not applicable - this confirms expected behavior rather than diagnosing a
fault.

### Safe corrective actions
If a missed run needs to happen, trigger it manually via the job-execution
endpoint. If missed runs are an operationally recurring problem, that's a
signal the in-process scheduling model itself may need revisiting - a
design question for a future phase, not something to patch around here.

### Escalate when
Not applicable directly.

---

## Symptom: duplicate executions under multiple API replicas

### Likely causes
**Confirmed, currently-latent risk**: no distributed lock or
leader-election mechanism exists anywhere in the scheduler. If the API is
ever scaled to more than one replica, every replica independently
registers and fires the same cron schedules.

### Checks
```bash
# Confirm how many api/api_staging containers are actually running
docker compose ps api
```
If more than one instance of the same service is running, duplicate
scheduled runs (and duplicate alert emails, duplicate backup attempts) are
expected, not anomalous.

### Safe corrective actions
Do not scale the `api`/`api_staging` service to more than one replica
without first addressing this gap - there is no configuration flag or
workaround available today that prevents duplication. This is an
architectural limitation to be fixed in code, not something troubleshooting
can resolve.

### Escalate when
Duplication is observed even with a single confirmed replica - that would
be a different, more serious problem (e.g. two independent deployments
pointed at the same database).

---

## Symptom: backup job fails

A backup run now produces a **backup set** - a single timestamped directory
per tier containing `database.sql`, `documents.tar.gz`, and `manifest.json`
(see [../operations/backups.md](../operations/backups.md)). The job result
reports the exact stage that failed (`failedStage` in the audit-log
`details`): `pg_dump`, `archive`, `checksum`, `manifest`, or `finalisation`.

### Likely causes
- `failedStage: pg_dump` - `DATABASE_URL` unreachable at the time the job
  ran, or `pg_dump` missing/wrong path. As of Phase 12.3A the API image
  ships `postgresql-client` (`pg_dump`/`psql`), so a missing binary should
  only happen with a broken image build or a bad `PG_DUMP_PATH` override.
- `failedStage: archive` - `tar` missing (again, bundled in the image
  since 12.3A) or `UPLOAD_DIR` unreadable.
- `failedStage: checksum` / `manifest` / `finalisation` - local backup
  directory not writable, or disk full.

### Checks
```bash
curl -s "http://localhost:3001/api/jobs/historique?jobCle=backup_quotidien" \
  -H "Cookie: sicot_access=<...>"
docker compose logs api | grep -i sauvegarde
```

### Safe corrective actions
Read `failedStage` first, then check the corresponding cause above. A
failed run leaves **no** partial set behind - the in-progress directory
(`*.inprogress`) is removed on any failure before completion, so there is
nothing to clean up manually. Do not delete existing completed backup-set
directories as a troubleshooting step.

### Escalate when
`DATABASE_URL`, the local destination, and the reported `failedStage`
cause are all confirmed correct and the job still fails.

---

## Symptom: NAS replication unavailable / skipped

Since Phase 12.3A the model is **local-first**: one verified local backup
set is created, then replicated (copied byte-for-byte) to NAS. NAS is no
longer an independent second `pg_dump`. A NAS replication failure **never**
invalidates or deletes the completed local set.

### Likely causes
- `nasReplicationStatus: non_configure` - `BACKUP_NAS_DIR` is unset. NAS
  replication is simply disabled; local backups are unaffected.
- `nasReplicationStatus: indisponible` - `BACKUP_NAS_DIR` is set but the
  directory does not exist. The job deliberately does **not** create the
  NAS root itself (an auto-created directory would not prove the network
  share is actually mounted), so an absent root reads as "not mounted".
- `nasReplicationStatus: echec` - the root exists but the copy failed
  (share went away mid-copy, permissions, disk full on the NAS).

### Checks
Confirm the mount is actually present and writable at the OS/host level
where the job runs - this is infrastructure, not application
configuration. The local backup set's own audit entry
(`localStatus: ok`) confirms the data was captured regardless.

### Safe corrective actions
Escalate the mount issue to whoever manages the NAS. Once the share is back,
run the manual `backup_sync_nas` job (`POST /api/jobs/backup_sync_nas/executer`,
`SYSTEM_ADMIN_OPERATION`) to copy any completed local sets that are missing
on the NAS. It never deletes anything and skips `*.inprogress` directories.

### Escalate when
The NAS root is confirmed mounted and writable at the OS level and
replication still reports `echec`.

---

## Symptom: a real restore is being considered

### Likely causes
Not a fault - this is the situation restore tooling exists for. As of
Phase 12.3B, `scripts/restore-backup.mjs` exists, is covered by focused
tests, and its real-Postgres round trip is proven in CI (`restore-verify`
job) against synthetic data. Full usage is in
[../operations/restore-drill.md](../operations/restore-drill.md).

### Checks
Confirm you have: the exact backup-set directory to restore (never
"latest" - the CLI requires an explicit path), an empty target database,
an empty or nonexistent target upload directory, and - important, see
restore-drill.md's Limitations section - that the API image's installed
`pg_dump`/`psql` major version matches the target PostgreSQL server's major
version. A version mismatch here was found and documented during Phase
12.3B implementation and can make a restore fail at the first SQL
statement.

### Safe corrective actions
Run `scripts/restore-backup.mjs --mode verify` first, against a disposable
database and scratch directory, to confirm the specific backup set you
intend to use actually restores cleanly - do not go straight to
`--mode disaster-recovery` against a real target. Disaster-recovery mode
still requires an empty target (its `--confirm-destructive` /
`--confirm-database-name` flags acknowledge the action, they do not permit
restoring onto an existing schema) - preparing that empty target (dropping/
recreating the database, providing an empty upload directory) is an
operator step the CLI deliberately does not perform. See
[../operations/restore-drill.md](../operations/restore-drill.md) for the
full procedure, including the manual drill runbook.

### Escalate when
Always, before running `--mode disaster-recovery` against anything other
than a disposable test environment - this needs deliberate planning, not
an improvised troubleshooting response.
