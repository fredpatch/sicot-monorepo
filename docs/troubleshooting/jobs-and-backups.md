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
  by default), but it is a real, currently-latent risk.

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

### Likely causes
- `pg_dump` not found on `PATH` inside the container/host running the job
  (`PG_DUMP_PATH` misconfigured or unset with no working default present).
- Local or NAS destination directory not writable/mounted.
- `DATABASE_URL` itself unreachable at the time the job ran (same causes
  as any other DB connection failure).

### Checks
```bash
curl -s "http://localhost:3001/api/jobs/historique?jobCle=backup_quotidien" \
  -H "Cookie: sicot_access=<...>"
docker compose logs api | grep -i sauvegarde
```

### Safe corrective actions
Confirm `pg_dump` is present and executable in the environment the job
actually runs in, and that both destination directories are writable. Do
not delete existing backup files as a troubleshooting step.

### Escalate when
`pg_dump`, `DATABASE_URL`, and both destinations are all confirmed correct
and the job still fails.

---

## Symptom: NAS destination unavailable

### Likely causes
The NAS mount (configured via `BACKUP_NAS_DIR`, IT-managed, not
admin-editable) is unreachable - a network mount issue outside this
application's control.

### Checks
Confirm the mount is actually present and writable at the OS/host level
where the job runs - this is infrastructure, not application
configuration.

### Safe corrective actions
Escalate to whoever manages the NAS mount. The application-level backup job
will still succeed to the local destination even if the NAS destination
fails (both are written independently) - check the local destination's
own history entry to confirm partial success.

### Escalate when
Always - a NAS mount problem is an infrastructure issue outside what
application-level troubleshooting can resolve.

---

## Symptom: `pg_dump` unavailable or wrong path

### Likely causes
`PG_DUMP_PATH` unset (defaults to relying on `PATH`) or set to a path that
doesn't exist in the environment actually running the job - this variable
is used but undocumented in any tracked `.env.example`, so it's easy to
overlook. See
[../operations/configuration-reference.md](../operations/configuration-reference.md#backup--nas).

### Checks
```bash
docker compose exec api sh -c 'which pg_dump || echo "not found"'
```

### Safe corrective actions
Set `PG_DUMP_PATH` explicitly if `pg_dump` isn't on the default `PATH` in
that environment.

### Escalate when
`pg_dump` is confirmed present and correctly referenced, and the backup
job still fails to invoke it.

---

## Symptom: backup exists but restore confidence is unknown

### Likely causes
Not a fault - this reflects the actual current state of the system.
**Restore has not been evidenced as tested anywhere in this repository.**
There is no restore script, tooling, or drill.

### Checks
Not applicable via automated checks - this is a documented process gap,
not a runtime symptom.

### Safe corrective actions
**No restore recipe is provided here, invented, or implied.** If a restore
is genuinely needed, this requires an operator to manually run `pg_restore`
or `psql` against a chosen dump file, with no in-repo guidance - treat this
as a high-stakes manual operation requiring care, not a routine
troubleshooting step. Before relying on backups as a disaster-recovery
plan, a restore drill should be designed and validated - see
[../operations/backups.md](../operations/backups.md#restore-status).

Also remember: **current backups are database-only.** Uploaded document
bytes are not covered by any backup mechanism - a database restore alone
would not recover document files, only the metadata referencing them.

### Escalate when
Always, if an actual restore is being considered for anything other than a
disposable test environment - this needs deliberate planning, not an
improvised troubleshooting response.
