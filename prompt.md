Phase 9 baseline audit + validation is approved.

Proceed with the migration baseline replacement exactly as validated.

Required:

remove the old active migration chain under packages/server/drizzle/
replace it with the validated clean baseline:
drizzle/
0000_initial_schema.sql
meta/
0000_snapshot.json
_journal.json
remove temporary drizzle_baseline/
remove temporary drizzle.baseline.config.ts
do not modify application code
do not touch sicot_db
do not add unaccent
do not clean up the duplicate users.matricule unique indexes in this commit

After replacement, re-run:

npx drizzle-kit migrate against a freshly reset disposable sicot_migration_check
verify ledger contains exactly the new baseline migration
verify user_role = agent, operateur, admin, super_admin
verify missions.rapport_responsable_id nullable FK → users.id
verify all tables are empty after migration
run drizzle-kit generate and confirm No schema changes, nothing to migrate
full build
full test suite
client tsc --noEmit

Then commit the baseline reset.

Suggested commit message:

chore(db): reset migrations to pre-production baseline

Commit body should mention:

old development migration history replaced by one clean baseline
no staging/production environment had consumed the old chain
baseline generated from current authoritative schema.ts
fresh database migration validated successfully
no seed/mock data included

Push after the commit if validation remains green.

Final report:

commit hash
push result
exact baseline files
fresh-DB ledger result
schema verification result
final test totals
clean git status
