# ADR-0002: Workflow responsibility is not a persistent role

Status: Accepted
Date: 2026-09-09

## Context

Several workflows in SICOT need to name a specific account as responsible
for a specific piece of work: who translates a given translation request,
who is designated to submit a given mission's official report, and
historically, who reviews a translation. These are per-record assignments
- they name one account against one row, not a class of accounts against
the whole system.

The schema models this with ordinary foreign-key columns pointing at
`users.id` - e.g. `missions.rapportResponsableId` (references `users.id`,
nullable, enforced to always name a *current mission participant* in
`missions.service.ts`'s `validerResponsableRapport`, not as a database
constraint, because participant membership is itself mutable). Comparable
per-record assignment fields exist elsewhere in the schema for translation
workflow responsibility.

`traducteur` and `relecteur` existed at an earlier point as persistent
roles, then were merged into `operateur` and no longer exist as roles
anywhere in the codebase - `packages/shared/src/auth/roles.ts` documents
this directly: `UserRole` is `'agent' | 'operateur' | 'admin' |
'super_admin'`, and its header comment states `traducteur`/`relecteur`
"were migrated to `operateur` and no longer exist in the database or in
this type."

## Decision

**Workflow responsibility is recorded as a per-record foreign-key
assignment, never as a persistent role.** A user who is currently assigned
as, say, a mission's report-responsible participant holds that
responsibility only for that one mission record - not as an account-wide
trait. `traducteur` and `relecteur` are **not valid persistent roles** in
the current system; any account capable of translation work holds the
`operateur` role (or higher) with the relevant `TRANSLATION_*`
capabilities, and which specific request or mission it is responsible for
is a fact about that record, not about the account.

## Why

- **Responsibility belongs to a specific workflow instance**, not to the
  account in general. A record's assigned responsible party is a fact
  about that record.
- **A user may hold different responsibilities across different records**
  at the same time - assigned to one mission's report, uninvolved in
  another's - which a persistent role could not express without either a
  combinatorial explosion of roles or a role that means nothing outside
  its record-specific context.
- **Persistent identity (the account's role) should remain stable** and
  independent of which specific workflow instances happen to be assigned
  to it today. Capability checks (see
  [ADR-0001](./0001-single-persistent-role-with-capabilities.md)) answer
  "can this role ever do X"; the per-record assignment field answers "is
  *this* account the one designated for *this* record" - two different
  questions that would collapse into one confusing concept if responsibility
  were modeled as a role.

## Consequences

- Assignment fields (`rapportResponsableId` and comparable fields
  elsewhere) are ordinary foreign keys to any capability-holding user -
  never a role value, never checked via `hasCapability` on their own.
  Access to act on the assigned record requires both the relevant
  capability *and* being the assigned party, layered as a contextual
  policy check on top of the capability check.
- Reassigning responsibility for a record is a data update to that one row
  - it never requires a role change on any account.
- `traducteur`/`relecteur` must never reappear as role values, database
  enum members, or capability names - any future workflow-responsibility
  concept should follow the same per-record foreign-key pattern
  established here, not reintroduce a persistent role for it.

## Alternatives considered

None beyond the historical `traducteur`/`relecteur` roles themselves,
which were the earlier approach and were deliberately merged into
`operateur` - this ADR records the outcome of that consolidation as the
current, intended model, not a hypothetical alternative still under
consideration.

## References

- [../../security/authorization.md](../../security/authorization.md#workflow-actors-vs-persistent-roles)
- [../data-model.md](../data-model.md)
- `packages/shared/src/auth/roles.ts`
- `packages/server/src/modules/missions/services/missions.service.ts`
  (`validerResponsableRapport`)
- `packages/server/src/db/schema.ts` (`missions.rapportResponsableId`)
