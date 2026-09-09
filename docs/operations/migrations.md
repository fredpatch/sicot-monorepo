# Database Migrations

The current Drizzle migration model and safe usage going forward. Schema
structure itself (tables, relationships) is documented in
[../architecture/data-model.md](../architecture/data-model.md); this
document covers the operational mechanics only.

## Current state

`packages/server/drizzle/` contains a single migration:

```
packages/server/drizzle/
├── 0000_initial_schema.sql
└── meta/
    ├── 0000_snapshot.json
    └── _journal.json
```

`meta/_journal.json` lists exactly one entry (`0000_initial_schema`) - no
`0001_*.sql` or later file exists. **0000 is still the sole migration.**

## The baseline rule

**`0000_initial_schema.sql` may only be rewritten while no persistent
staging or production environment depends on it.** This baseline was
established intentionally in Phase 9 - it is not a placeholder waiting to be
replaced. Once real staging or production data has been migrated against
0000, it becomes immutable: it must never be edited or regenerated from
scratch after that point. **All future schema changes append `0001_*.sql`
and onward** - never modify or replace `0000_initial_schema.sql` once any
persistent environment has consumed it.

## Source of truth

`packages/server/src/db/schema.ts` is the single source of schema truth.
`packages/server/drizzle.config.ts` points `schema` at that file and `out`
at `./drizzle`; `drizzle-kit generate` reads the schema file to produce new
SQL migrations and snapshots. The runtime DB client
(`packages/server/src/db/index.ts`) imports the same schema module for
query typing - one definition drives both migration generation and runtime
types.

## Commands

All commands below are copied verbatim from `packages/server/package.json`
(and the root `package.json`, which proxies to the same scripts via
`--workspace=packages/server`) - nothing here is invented or assumed from
Drizzle's general documentation.

| Purpose | Command | Underlying |
|---|---|---|
| Generate a new migration from schema changes | `npm run db:generate` | `drizzle-kit generate` |
| Apply migrations | `npm run db:migrate` | `drizzle-kit migrate` |
| Open Drizzle Studio (visual DB browser) | `npm run db:studio` | `drizzle-kit studio` |

### Development workflow

1. Edit `packages/server/src/db/schema.ts`.
2. `npm run db:generate` - produces a new `000N_*.sql` file plus an updated
   snapshot; review the generated SQL before committing.
3. `npm run db:migrate` - applies it to your local database.
4. Commit the schema change together with the generated migration file(s) -
   they must travel together.

### Staging / production

There is no separate `db:migrate:staging` or `db:migrate:prod` script - the
same `npm run db:migrate` command runs inside a one-off container as part of
each environment's deploy script:

- **Staging** (`scripts/deploy-staging.sh`): after `postgres_staging` is
  confirmed healthy, `docker compose ... run --rm --no-deps api_staging npm
  run db:migrate` runs, and only then does the rest of the stack get
  (re)started via `up -d --remove-orphans`.
- **Production** (`scripts/deploy-prod.sh`): identical shape - `postgres` is
  started and waited on, then `docker compose ... run --rm --no-deps api
  npm run db:migrate` runs against the freshly-pulled `api` image, and only
  then does `up -d --remove-orphans` restart the full stack.

In both cases, **migrations run before the application services that would
depend on the new schema are (re)started.** This is orchestrated by the
deploy scripts, not by application code at boot - see
[deployment.md](./deployment.md) for the full sequence.

## Schema vs. migration responsibility

- `schema.ts` describes the desired end state.
- `drizzle-kit generate` diffs that against the last snapshot and writes the
  SQL needed to get there as a new numbered migration file.
- `drizzle-kit migrate` applies any migration files not yet recorded as
  applied, in order.
- Nothing in this repo auto-generates migrations at deploy time - migration
  files are generated once, locally, reviewed, and committed; deploy scripts
  only ever *apply* what's already committed.

## Destructive operations

**No reset/drop/truncate script exists in this repository.** There is no
`db:reset`, `db:drop`, or equivalent in either `package.json`, and a
repo-wide search for `DROP TABLE`/`DROP DATABASE`/`TRUNCATE` outside of SQL
migration content itself found nothing.

`scripts/setup-db.sql` is not destructive - it's a one-time, manually-run
bootstrap script (role/database/extension creation) documented in
[installation-bootstrap.md](./installation-bootstrap.md); it is not invoked
by any CI/deploy script.

`packages/server/src/db/seed-demo.ts` (`npm run db:seed-demo`) is
**insert-only demo data**, not a reset mechanism, and is explicitly gated:
it refuses to run when `NODE_ENV=production` and exits non-zero if it
detects that. It is not referenced by any deploy script, compose file, or
CI workflow - confirmed dev-only both by its own runtime guard and by
being unreferenced anywhere in the staging/production path.

**Do not present database reset as a production recovery technique** - none
exists in this repository, and none should be improvised outside of a
validated restore procedure (see [backups.md](./backups.md), which states
plainly that restore has not been evidenced as tested).
