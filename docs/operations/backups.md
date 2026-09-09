# Backups

What backup mechanisms exist today, and - just as importantly - what
remains unvalidated. This document is deliberately conservative: it states
only what the repository proves, and does not describe restore as tested
unless it is.

Scheduling mechanics (cron cadence, manual-execution endpoint, execution
history) are shared with the rest of the job system - see
[scheduled-jobs.md](./scheduled-jobs.md); this document covers backup
content, destinations, retention, and restore status only.

## What is backed up

**Only the PostgreSQL database**, via `pg_dump` (plain-format SQL dump).
`packages/server/src/jobs/backup.ts` builds and runs a `pg_dump` command
against `DATABASE_URL` directly.

**Uploaded documents and files are not backed up by this mechanism.** There
is no reference to the upload directory (`UPLOAD_DIR` / the `sicot/documents`
volume) anywhere in the backup job code. In production, uploaded documents
live in the `sicot_uploads_prod` Docker volume, which has no backup path in
this codebase today. This is a real coverage gap, not a documentation
omission - see Findings below.

**Because of this, a database backup alone cannot fully reconstruct SICOT's
document state.** Restoring only the database would recover metadata,
records, and references to documents (`documents` rows, storage paths,
etc.) without recovering the underlying uploaded file bytes those records
point to - the two are backed up independently today, and only one of them
is.

## Where backups go

Two destinations, written in parallel on every run:

- **Local** - directory from the DB-editable parameter `backup_local_dir`
  (admin can change this via the Settings screen), falling back to the
  `BACKUP_LOCAL_DIR` environment variable if the parameter isn't set. In
  production this is the `sicot_backups_prod` volume, mounted at
  `/sicot/backups/local` on `api`. **Staging has no equivalent volume** -
  local dumps there live inside the container's ephemeral filesystem and do
  not survive a container recreate.
- **NAS** - directory from the `BACKUP_NAS_DIR` environment variable only;
  deliberately not admin-editable (IT-managed network mount). No hostname,
  credential, or mount detail is reproduced here - see
  [configuration-reference.md](./configuration-reference.md) for the
  variable name only.

Each destination is organized into per-tier subfolders: `quotidien/`,
`hebdomadaire/`, `mensuel/`, `annuel/`.

## Retention strategy

Grandfather-father-son rotation, applied only after a promotion to the next
tier succeeds on at least one destination - never a blind delete:

| Tier | Kept | Pruned when |
|---|---|---|
| Daily | most recent N (default 7; admin-editable DB parameter) | A weekly promotion succeeds |
| Weekly | most recent N (default 5; admin-editable) | A monthly promotion succeeds |
| Monthly | most recent N (default 12; admin-editable) | A yearly promotion succeeds |
| Yearly | kept indefinitely - never pruned | never |

## How jobs are triggered

- **Scheduled:** a single daily cron (`0 0 * * *`) always runs the daily
  dump; the same run internally checks the calendar and additionally
  promotes to weekly/monthly/yearly tiers on Sundays / month-end / year-end
  respectively. See [scheduled-jobs.md](./scheduled-jobs.md) for the exact
  keys and cadence.
- **Manual:** `POST /api/jobs/:cle/executer` for `backup_quotidien`,
  `backup_hebdomadaire`, `backup_mensuel`, `backup_annuel`, and
  `backup_sync_nas` (a one-off catch-up copy of local-only backups to the
  NAS destination) - all five gated behind the `SYSTEM_ADMIN_OPERATION`
  capability (super_admin only). Endpoint contract:
  [administration/jobs.md](../api/endpoints/administration/jobs.md).

## What success/failure evidence exists

Every backup run - scheduled or manual - writes a row to the `jobExecutions`
history table (see [scheduled-jobs.md](./scheduled-jobs.md)) and a
corresponding entry to the general audit log (action codes such as
`SAUVEGARDE_QUOTIDIEN` / `SAUVEGARDE_QUOTIDIEN_ECHEC`). Console output is
the only "live" signal beyond that.

**There is no failure notification.** No email, Slack, or other alert fires
on backup failure - a failed backup is visible only if someone actively
checks the job history UI, the audit log, or container stdout logs. This is
a real observability gap - see
[monitoring-and-health.md](./monitoring-and-health.md).

## Restore status

**Restore has not been evidenced as tested.**

A repository-wide search for restore-related code found nothing related to
backup restoration - the only "restore" hits in the codebase are unrelated
document/translation soft-delete-restore features in other modules. **There
is no restore script, no `pg_restore` invocation, no restore tooling, and
no restore test anywhere in this repository.** Restoring a backup today
would require an operator to manually run `pg_restore` or `psql` against a
chosen `.sql` dump file, with no in-repo guidance, tooling, or automation to
support that.

A restore drill must be designed and validated before backups can be
considered a proven disaster-recovery mechanism. Until that happens, treat
"backups are being written" and "the data is recoverable" as two separate,
unequally-proven claims.

This document intentionally does not create a combined
`backups-and-restore.md` - a real restore procedure, once designed and
validated, belongs in its own document at that point, not asserted here in
advance of that work.

## Security

No NAS credentials, SSH keys, database passwords, or private hostnames
appear in this document - only environment variable names and conceptual
destinations, per the backup job's own env var usage in
`packages/server/src/jobs/backup.ts`.

## New findings from this audit (not fixed - documentation only)

1. **Uploaded documents are not covered by any backup mechanism.** Only the
   Postgres database is dumped; the `sicot_uploads_prod` volume (and its
   staging/dev equivalents) has no corresponding backup path anywhere in
   the codebase. Impact: a volume-level failure or accidental deletion
   would lose uploaded documents even though the database backup succeeded
   and reported healthy. Suggested remediation: extend the backup job (or
   add a parallel one) to archive the upload directory, or document an
   external volume-snapshot strategy if one exists outside this repo.
2. **No restore tooling or drill exists.** See Restore status above.
   Suggested remediation: design and validate a restore procedure
   (ideally rehearsed against a non-production database) before relying on
   these backups as a disaster-recovery plan.
3. **No failure notification on backup failure.** A failed backup is only
   discoverable by actively checking job history/audit logs - there is no
   push alert. Suggested remediation: at minimum, surface failed backup
   executions somewhere an operator will actually see promptly (e.g. an
   admin-dashboard indicator, since email/Slack alerting infrastructure
   does not currently exist in this project - see
   [monitoring-and-health.md](./monitoring-and-health.md)).
4. **Staging has no backup volume.** Local staging dumps live in the
   container's ephemeral filesystem and are lost on container recreation.
   Low impact given staging is not the system of record, but worth noting
   if staging is ever used to validate the backup mechanism itself.
