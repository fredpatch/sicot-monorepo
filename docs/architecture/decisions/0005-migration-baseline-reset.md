# ADR-0005: Migration baseline reset

Status: Accepted
Date: 2026-09-09

## Context

`packages/server/drizzle/` contains a single migration,
`0000_initial_schema.sql`, with `meta/_journal.json` listing exactly one
entry (tag `0000_initial_schema`) - no earlier migration chain exists
alongside it in the repository. Prior project phases (referenced as
"Phase 9" in existing operational documentation) established this single
file as the intentional starting point for the schema's migration history,
rather than the repository carrying forward whatever incremental migration
chain had accumulated during earlier development.

This was possible specifically because, at the time of the reset, no
persistent staging or production environment yet depended on the old
migration chain - resetting a migration history is only safe while nothing
real has to be migrated *through* it. `docs/operations/migrations.md`
(Phase 11.4) already documents the resulting rule for anyone operating the
system today; this ADR records the *decision* itself and its rationale, not
the day-to-day operating procedure (see that document for the procedure).

## Decision

The active migration history was intentionally reset to a single baseline,
**`0000_initial_schema.sql`**, while the project was still before any
persistent staging/production environment depended on the prior migration
chain.

- **`0000_initial_schema.sql` is the canonical baseline.**
- **Once it has been consumed by persistent staging or production data, it
  becomes immutable** - it must never be edited or regenerated from
  scratch after that point.
- **All future schema changes append `0001_*.sql` and onward.**

## Consequences

- **Cleaner migration history before production use** - a single baseline
  file is easier to read, review, and reason about than an accumulated
  chain of incremental migrations from earlier development, none of which
  needed to be preserved once no live environment depended on them.
- **Easier fresh-environment bootstrap** - initializing a new database (a
  fresh dev checkout, a new staging environment) applies one file instead
  of replaying an entire historical chain.
- **Baseline rewrite becomes forbidden once persistent environments depend
  on it.** This is the direct cost of the reset: the same operation that
  made the baseline clean (rewriting migration history) cannot be repeated
  once real data exists on top of it, without risking that data. From this
  point forward, schema evolution is strictly additive
  (`0001_*.sql`, `0002_*.sql`, ...) - see
  [../../operations/migrations.md](../../operations/migrations.md#the-baseline-rule)
  for the enforced procedure.

## Alternatives considered

- **Preserve the full historical migration chain** - rejected in favor of
  the single-baseline reset, for the cleaner-history and easier-bootstrap
  reasons above, while it was still safe to do so (no persistent
  environment depended on the old chain yet).
- **Continue rewriting the baseline indefinitely** - **explicitly
  rejected** as an ongoing practice. Resetting a baseline is a one-time
  operation that is only safe before persistent data depends on it; doing
  it again after a real staging or production environment has consumed
  `0000_initial_schema.sql` would risk that environment's actual data and
  is not an available option going forward. This is why the rule above is
  stated as a hard constraint, not a preference.

## References

- [../../operations/migrations.md](../../operations/migrations.md)
- [../data-model.md](../data-model.md#migration-baseline)
- `packages/server/drizzle/0000_initial_schema.sql`
- `packages/server/drizzle/meta/_journal.json`
