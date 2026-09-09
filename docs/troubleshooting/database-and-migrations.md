# Database & Migrations

Migration mechanics and safe usage rules:
[../operations/migrations.md](../operations/migrations.md). This document
covers diagnosing failures only.

## Symptom: PostgreSQL connection failure

### Likely causes
- `DATABASE_URL` unset, malformed, or pointing at the wrong host/port
  (native vs. Docker hostnames differ - `postgres`/`postgres_staging` only
  resolve *inside* the Compose network, not on your host).
- Postgres container not yet healthy when something else tried to connect.
- Wrong credentials (`DB_USER`/`DB_PASSWORD`/`DB_NAME` vs. what the
  database was actually initialized with).

### Checks
```bash
node -e "console.log(!!process.env.DATABASE_URL)"
docker compose ps postgres
docker compose logs postgres
psql "$DATABASE_URL" -c "select 1;"   # native, or from inside a container
```

### Safe corrective actions
Confirm the connection string's host matches where you're actually running
from (native host vs. a Compose service name) - see
[../operations/configuration-reference.md](../operations/configuration-reference.md#database)
for the two different ways `DATABASE_URL` vs. `DB_*` are modeled across
environments. Wait for `postgres`'s healthcheck before retrying.

### Escalate when
Credentials and hostname are confirmed correct, the container reports
healthy, and the connection still fails.

---

## Symptom: `npm run db:generate` or `npm run db:migrate` fails

### Likely causes
- `DATABASE_URL` not reachable (see above) - `drizzle-kit` needs a live
  connection for both commands.
- A generated migration conflicts with the current database state (e.g.
  someone applied a hand-written change outside Drizzle).
- Ran from the wrong workspace - both commands are defined in
  `packages/server/package.json`; running `npm run db:generate` from
  outside a workspace context that resolves there will fail differently.

### Checks
```bash
npm run db:migrate --workspace=packages/server
cat packages/server/drizzle/meta/_journal.json   # what Drizzle thinks is applied
```

### Safe corrective actions
Re-run from repo root using the documented commands only - see
[../operations/migrations.md](../operations/migrations.md#commands). Do not
hand-edit `_journal.json` or migration SQL files to work around an error;
investigate the actual mismatch first.

### Escalate when
The command fails with a schema-level error you can't attribute to
connectivity or an out-of-band manual change.

---

## Symptom: schema/migration drift - the database doesn't match `schema.ts`

### Likely causes
- A migration was generated but never applied in this environment.
- A previous manual/ad-hoc SQL change was made directly against the
  database, bypassing Drizzle.

### Checks
```bash
npm run db:migrate --workspace=packages/server   # applies anything pending
npm run db:studio --workspace=packages/server    # visually inspect current schema/data
```

### Safe corrective actions
Apply any pending migration via the documented command. If the database was
changed outside Drizzle, that drift needs to be reconciled deliberately
(usually by hand-writing a corrective migration) - do not regenerate a
fresh baseline to paper over it.

### Escalate when
The drift can't be explained by "a migration wasn't applied yet" - this
needs a deliberate schema-reconciliation decision, not a routine fix.

---

## Symptom: temptation to rewrite `0000_initial_schema.sql`

**Do not.** `0000_initial_schema.sql` was established intentionally in
Phase 9. **Once it has been consumed by persistent staging or production
data, it must never be edited or regenerated from scratch** - every future
schema change appends `0001_*.sql` and onward. This applies even if
rewriting it would "look cleaner." Full rule:
[../operations/migrations.md](../operations/migrations.md#the-baseline-rule).

If you're not sure whether staging/production has already consumed it,
treat it as consumed and append instead - the cost of an unnecessary
`0001` migration is far lower than the cost of rewriting a baseline
underneath live data.

---

## Symptom: stale local database (schema out of date after pulling changes)

### Likely causes
Someone else added a migration file you haven't applied locally yet.

### Checks
```bash
git log --oneline -- packages/server/drizzle/
npm run db:migrate --workspace=packages/server
```

### Safe corrective actions
Pull the latest code, then run `npm run db:migrate`. **There is no
`db:reset` or `db:drop` script in this repository** - do not invent one or
manually drop tables as a first-line fix. If your local data genuinely
needs to be discarded and recreated from scratch during development, that
means manually dropping and recreating the database yourself outside any
project-provided tooling (e.g. via `scripts/setup-db.sql` again, native
dev only) - understand this is destructive to local data before doing it,
and it is not something to reach for automatically.

### Escalate when
`db:migrate` reports nothing pending, but the running application still
behaves as if columns/tables are missing - this suggests the app is
pointed at a different database than you think.

---

## Symptom: migration succeeds locally but fails in staging

### Likely causes
- Local database has already accumulated ad-hoc/manual changes that mask a
  problem the migration would otherwise surface.
- Staging's migration step runs in a one-off container
  (`docker compose ... run --rm --no-deps api_staging npm run db:migrate`,
  per [../operations/deployment.md](../operations/deployment.md#staging))
  against a database state that's diverged from your local one - e.g.
  staging already ran further ahead, or has different data triggering a
  constraint your local test data didn't.

### Checks
```bash
# From the staging deploy script's own migration step:
docker compose -f docker-compose.staging.yml --env-file .env.staging \
  run --rm --no-deps api_staging npm run db:migrate
```
Run this deliberately (not as part of a full deploy) to see the actual
error in isolation.

### Safe corrective actions
Read the actual constraint/error staging reports - it's almost always more
specific than "it works locally." Do not respond by dropping and
recreating the staging database as a first resort; that database may be
the only copy of whatever state staging is meant to be validating.

### Escalate when
The error is caused by real data in staging that a migration can't cleanly
handle - this needs a deliberate data-migration decision, not a schema
rewrite.
