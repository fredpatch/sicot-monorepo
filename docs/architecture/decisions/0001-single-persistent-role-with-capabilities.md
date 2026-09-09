# ADR-0001: Single persistent role with capabilities

Status: Accepted
Date: 2026-09-09

## Context

Every SICOT account needs an authorization model that decides what it can
do across a growing number of modules (missions, accords, courriers,
documents, translation, administration, ...). Two structurally different
approaches were available: model access as many fine-grained persistent
roles (or multiple roles per account), or give each account exactly one
coarse persistent role and derive fine-grained permissions from a separate
capability layer.

The implemented model is the latter: `packages/shared/src/auth/roles.ts`
defines exactly four persistent roles - `agent`, `operateur`, `admin`,
`super_admin` - and `packages/shared/src/auth/role-capabilities.ts` maps
each role to an additive set of `Capability` values (each tier is the one
below it plus what's new for that tier). `hasCapability(role, capability)`
is the single function both server middleware
(`requireCapability`) and the client (route guards, UI gating) call to
decide access - never a raw role-name comparison.

## Decision

Each account carries **exactly one persistent role**. Authorization
breadth is expressed through **capabilities**, not through additional
persistent roles or multiple roles per account.

The chain is: **persistent role → capability registry
(`ROLE_CAPABILITIES`) → middleware (`requireCapability`) → contextual
policy** (see [ADR-0002](./0002-workflow-responsibility-not-persistent-role.md)
for the contextual-policy layer). A capability check answers "can this
role ever do X"; a contextual policy answers "can *this* account do X *to
this specific record*."

## Consequences

- **Simpler account model.** An account has one role, full stop - no
  multi-role assignment logic, no role-precedence rules to design or
  reason about.
- **Additive capability tiers.** `operateur` is `agent`'s capabilities plus
  more, `admin` is `operateur`'s plus more, and so on - the relationship
  between tiers stays visible directly in code
  (`role-capabilities.ts`) instead of being restated by hand per role.
- **Domain-specific access remains contextual, not role-based.** Whether a
  specific account can act on a specific record (a document's internal
  visibility, a mission's designated report responsible, request
  ownership) is decided by a contextual policy function layered on top of
  the capability check - it is never modeled as a persistent role of its
  own. See [ADR-0002](./0002-workflow-responsibility-not-persistent-role.md).
- **Adding a new capability never requires creating a new persistent
  role.** A new permission is added to `Capability` and assigned to the
  appropriate role tier(s) in `role-capabilities.ts` - the four-role set
  itself does not grow.
- **Fails closed.** `hasCapability` returns `false` for any role string not
  present in `ROLE_CAPABILITIES` (a corrupted session, a stale role value)
  rather than throwing - denial (403), not a crash (500). See
  [../../security/authorization.md](../../security/authorization.md#fail-closed-behavior).

## Alternatives considered

- **Many fine-grained persistent roles** (e.g. a distinct role per module
  or workflow stage) - rejected as the primary model. This would require a
  new persistent role every time a new permission boundary is needed,
  coupling the account schema to the permission surface instead of
  decoupling them.
- **Multiple roles per account** - rejected. A single role keeps the
  account model simple and the fail-closed capability lookup
  straightforward; there is no evidence in the current implementation or
  its history that multiple simultaneous roles per account were ever
  implemented and later removed - this ADR does not claim they were.

## References

- [../overview.md](../overview.md#authorization-architecture)
- [../../security/authorization.md](../../security/authorization.md)
- `packages/shared/src/auth/roles.ts`
- `packages/shared/src/auth/role-capabilities.ts`
