# Scheduled Jobs

The actual in-process job scheduler and its operational model. Job
endpoints (capability requirements, request/response shapes) are documented
in
[../api/endpoints/administration/jobs.md](../api/endpoints/administration/jobs.md);
this document covers the scheduler itself.

## Scheduler

**Library:** `node-cron`.

**Where it starts:** inside the `app.listen()` success callback in
`packages/server/src/index.ts` - four `demarrer*` functions are called
there, one per job family, each internally calling `cron.schedule(...)`.
This means **the scheduler runs only while the API process is alive.** If
the process is down when a scheduled time passes, nothing runs and nothing
catches up automatically (the one partial exception is a manual
NAS-resync job - see [backups.md](./backups.md)).

**Registry vs. scheduler - these are two different things:**
`packages/server/src/jobs/registre.ts` (`REGISTRE_JOBS`) is a lookup table
used only for the manual-execution list/UI and capability checks - it is
**not** what triggers cron runs. The actual cron triggers live independently
in each `packages/server/src/jobs/*.ts` file. Keep this distinction in mind
when reading the table below: a job appearing in the registry does not by
itself mean it runs on a schedule.

## Registered jobs

| Key | Cadence | What it does |
|---|---|---|
| `accords_expiration` | daily, `0 8 * * *` | Flips accords past their expiry date from `actif` to `expire` |
| `accords_alertes` | daily, `0 8 * * *` (same tick as above) | Sends deadline-alert emails to admin/super_admin users at configurable thresholds |
| `courriers_criticite` | registry-only - **no dedicated cron trigger found** | Recomputes correspondence backlog criticity when manually run |
| `recommandations_retard` | registry-only - **no dedicated cron trigger found** | Flags overdue recommendations when manually run |
| `backup_quotidien` | daily, `0 0 * * *` | Postgres dump to local + NAS destinations ("daily" tier) |
| `backup_hebdomadaire` | triggered inside the same daily run, only on Sundays | Promotes the daily dump to the weekly tier, then prunes old daily dumps |
| `backup_mensuel` | triggered inside the same daily run, only on the last day of the month | Promotes to the monthly tier, prunes old weekly dumps |
| `backup_annuel` | triggered inside the same daily run, only on the last day of the year | Promotes to the yearly tier (kept indefinitely), prunes old monthly dumps |
| `backup_sync_nas` | registry-only - no automatic cron | One-off catch-up copy of local-only backups to the NAS destination |
| `courriers_criticite_snapshot` | daily, `55 23 * * *` | Writes the day's criticity counts into a snapshot table used for analytics trend history |
| `rapport_mensuel` | monthly, `0 6 1 * *` | Generates the previous month's PDF + Excel report, with best-effort AI narrative |

Full backup-specific behavior (retention, destinations, restore status) is
in [backups.md](./backups.md), not duplicated here.

## Manual execution

`POST /api/jobs/:cle/executer` - route-level capability `JOB_EXECUTE`
(admin+), **plus a second, per-job check** inside the service: it looks up
that specific job's own `executionCapability` from the registry and
requires the caller to hold it. All five backup-related jobs
(`backup_quotidien`, `backup_hebdomadaire`, `backup_mensuel`,
`backup_annuel`, `backup_sync_nas`) require the stricter
`SYSTEM_ADMIN_OPERATION` capability (super_admin only); every other job
only needs `JOB_EXECUTE`, already satisfied by the route guard. Full
endpoint contract: [administration/jobs.md](../api/endpoints/administration/jobs.md).

## Execution history

Every run - scheduled or manual - writes a row to the `jobExecutions` table
(jobCle, module, source `manuel`/`cron`, success flag, summary, error,
duration, who triggered it). **This table is a history log, not a queue or
a scheduler.** `node-cron`'s in-process timer calls the job function
directly; the table only records what happened afterward. `GET
/api/jobs/historique` exposes it for the admin UI.

## Operational consequence of in-process scheduling

- **Jobs run only while the API process is alive.** A restart re-registers
  every `cron.schedule` call from scratch; a scheduled tick missed during
  downtime is simply skipped, not queued or replayed.
- **Multiple API replicas would duplicate scheduled runs.** No distributed
  lock, leader-election, or singleton-guard mechanism exists anywhere in
  the server (verified by search - no advisory locks, no Redis lock, no
  `IS_SCHEDULER`-style environment gate). Every `demarrer*` call runs
  unconditionally on every process boot. Today this is not an active
  problem because both `docker-compose.staging.yml` and
  `docker-compose.prod.yml` define a single `api`/`api_staging` service
  with no replica scaling configured - but if that were ever changed to
  run more than one API instance, every replica would independently fire
  the same cron schedules, causing duplicate accord-expiry updates,
  duplicate alert emails, and duplicate backup runs. This is a real,
  currently-latent risk, not a hypothetical one, and is not mitigated by
  anything in the codebase today.

## Failures

Most cron entry points wrap their job body in try/catch and record the
outcome (success or failure) to `jobExecutions` regardless of which way it
goes - e.g. the alerts job has two independent try/catch blocks per tick,
and the monthly-report and criticity-snapshot jobs are similarly wrapped.
The daily backup cycle does not wrap its own steps in try/catch, but its
internal dump/promote functions never throw synchronously - each
destination's outcome is captured in a result object instead, so failure is
represented as a `false` success flag rather than an uncaught exception, and
is still recorded to `jobExecutions`.

Manual execution (`POST /api/jobs/:cle/executer`) catches errors, logs both
to the general audit log and to `jobExecutions` with a failure flag, and
returns HTTP `502` if the job ran but failed internally (a deliberate
structured-failure response, not a transport-level error).

**No retry logic exists anywhere in the job system.** There is no retry
loop, no backoff, and no automatic re-queue on failure in any job file - a
failed run simply waits for its next scheduled tick, or requires a manual
re-trigger via the endpoint. Do not describe this system as having retries.
