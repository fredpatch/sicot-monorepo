# SICOT - Authorization

SICOT's authorization model: who can do what, and where that decision is
actually made. This is one of the most load-bearing documents in the
technical corpus - read it before adding any new route or client action.

## Persistent roles

Each user has exactly **one** persistent role, stored on `users.role`:

```
agent | operateur | admin | super_admin
```

Defined in
[`packages/shared/src/auth/roles.ts`](../../packages/shared/src/auth/roles.ts).
There is no numeric hierarchy and no secondary/legacy role column - a single
enum value per account.

## Capabilities

[`packages/shared/src/auth/`](../../packages/shared/src/auth/) is the
**canonical capability registry**, imported by both client and server -
there is no second copy of this logic anywhere.

```
persistent role (users.role)
  -> capability set (ROLE_CAPABILITIES, additive per tier)
    -> route/action requirement (requireCapability(), per-route middleware)
      -> contextual policy (service-layer check, see below)
```

Capability sets are **additive**: `operateur` = everything `agent` has plus
more; `admin` = everything `operateur` has plus more; `super_admin` =
everything `admin` has plus more
([`role-capabilities.ts`](../../packages/shared/src/auth/role-capabilities.ts)).
A capability is a named category of action (e.g. `DOCUMENT_DELETE`,
`AGREEMENT_MANAGE`) - not tied to any specific record.

## Middleware

All three exist and are actively used, defined in
[`packages/server/src/middleware/requireCapability.ts`](../../packages/server/src/middleware/requireCapability.ts):

- `requireCapability(capability)` - the role must carry this one capability.
- `requireAnyCapability(...capabilities)` - the role must carry at least one
  of the listed capabilities.
- `requireAllCapabilities(...capabilities)` - the role must carry every
  listed capability.

Each returns `401` if `req.user` is absent (not authenticated) and `403` if
the capability check fails - never a `500` for an authorization decision.
Applied per-route (not blanket at the router level in most modules), so a
router can mix ungated, capability-gated, and multi-capability routes as
each endpoint requires.

`authenticate`
([`packages/server/src/middleware/auth.ts`](../../packages/server/src/middleware/auth.ts))
is the separate, upstream middleware that establishes `req.user` from the
access-token cookie in the first place - see
[csrf-and-session-security.md](./csrf-and-session-security.md) for its
detail.

## Contextual authorization

Not every access rule can live in the static role/capability map, because
many rules depend on *which specific record* is being acted on, not just the
category of action. These live in the service layer, checked after the
capability gate has already passed. Verified examples:

- **Own request:** a translation request can only be recalled by the user
  who submitted it (`demande.demandeurId === userId`), checked in
  [`demandes.service.ts`](../../packages/server/src/modules/demandes/services/demandes.service.ts)
  regardless of the acting user's `REQUEST_RECALL_OWN` capability.
- **Designated mission report responsible:** only the participant named in
  `missions.rapportResponsableId` may submit/replace that mission's official
  report - see
  [data-model.md](../architecture/data-model.md#special-architectural-data-rules).
- **Document-specific access:** a user without `DOCUMENT_UPLOAD` can only
  access a document if it is marked internally visible or they uploaded it
  themselves (`verifierAccesDocument`,
  [`documents.service.ts`](../../packages/server/src/modules/document/services/documents.service.ts)) -
  see [document-access.md](./document-access.md) for detail.
- **Recommendation responsibility:** a mission recommendation carries its own
  `responsableId`, independent of who created the mission.

This document does not enumerate every contextual rule in the system - that
would turn it into a domain manual. The point is architectural: **capability
= can attempt this category of action; contextual policy = is this the right
record/state for this specific actor.** Both checks must pass.

## Workflow actors vs. persistent roles

A **persistent account role** (`agent`/`operateur`/`admin`/`super_admin`) is
who a user *is*. An **assigned workflow actor** is who is currently
*responsible for a specific record* - an ordinary foreign key, unrelated to
`UserRole`.

Examples: `traducteurId`, `relecteurId` (on `traductions`/
`demandesTraduction`), `rapportResponsableId` (on `missions`),
`responsableId` (on `recommandations`). Any user holding at least
`operateur`-tier capabilities can be assigned as a translator/reviewer on a
given record - there is no separate `traducteur` or `relecteur` role in the
codebase. Those role names were merged into `operateur` and removed from the
`UserRole` type entirely; where they still appear as column/variable names,
they denote "who is assigned," never "what role does this account hold."
Do not reintroduce them as roles.

## Fail-closed behavior

`hasCapability()`
([`role-capabilities.ts`](../../packages/shared/src/auth/role-capabilities.ts))
looks up the role in `ROLE_CAPABILITIES`; an unrecognized role string (a
corrupted session, a stale JWT carrying a role value that no longer exists)
has no entry and is treated as having **no capabilities** - the function
returns `false` rather than throwing. Every `require*Capability` middleware
then responds `403`, never a `500`, for that case. This is a deliberate
deny-by-default design, documented in the source itself.
