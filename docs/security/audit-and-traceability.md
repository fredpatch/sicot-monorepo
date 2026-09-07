# SICOT - Audit & Traceability

What SICOT actually records for traceability, and - just as important -
what it does not guarantee. Written to be accurate under scrutiny, not
reassuring.

## Schema

Single table, `auditLogs`
([architecture/data-model.md](../architecture/data-model.md#audit)):
`userId` (actor, nullable for system-triggered entries), `action` (free-text
string, no enum), `module` (a module code such as `M10`, `PORTAIL`),
`entiteId` (a generic integer - **not** a foreign key, and there is **no
paired `entiteType` column**, so which table `entiteId` refers to must be
inferred from the combination of `module` and `action`), `details` (a
freeform `jsonb` payload - shape varies by call site, not schema-enforced),
`ip`, `createdAt`. Indexed on `userId`, `module`, `createdAt`.

## How entries are written

**`logAudit()` is called explicitly, by hand, from inside service-layer
code** -
[`auth.service.ts:logAudit`](../../packages/server/src/modules/auth/services/auth.service.ts),
imported directly across many modules (auth, users, documents, portal,
missions, accords, courriers, and others). **There is no Express middleware
that automatically logs every request or every mutation.** Whether a given
action produces an audit entry depends entirely on whether the developer who
wrote that code path remembered to call `logAudit()`.

**Practical consequence, stated plainly: the absence of an audit entry for
some action does not mean that action didn't happen - it may simply mean the
code path that performed it doesn't call `logAudit()`.** Do not treat the
audit log as a complete record of every state change in the system. Treat it
as a curated, intentionally-instrumented log of security- and
compliance-relevant events (logins, password/OTP events, document
deletions, portal token issuance/consumption/exposure changes, and similar),
not as a database-level change-data-capture stream.

## Actor identification

`userId` identifies the acting account for user-initiated actions. It is
nullable specifically to allow system/cron-triggered entries (e.g. an
automated job) where there is no acting user. `ip` is captured from the
request (`req.ip`) where the call site passes it - not every `logAudit()`
call includes it (some system-triggered calls have no request context to
draw an IP from).

## Read access

`GET /api/audit/*` requires `authenticate` + `AUDIT_VIEW`
([`audit.route.ts`](../../packages/server/src/modules/audit/routes/audit.route.ts))
- an `admin`-tier-and-above capability. No lower role can read the audit
log.

## Notifications are not an audit ledger

The separate `notifications` table
([architecture/data-model.md](../architecture/data-model.md#outbound-notifications))
is an **outbound email send-log** for three reminder types (agreement
deadline, correspondence follow-up, recommendation reminder) - it records
that an email was attempted/sent and its delivery status, not a general
traceability record. Do not conflate it with `auditLogs`; they serve
different purposes and neither substitutes for the other.

## Immutability

**No cryptographic immutability or tamper-evidence is implemented.**
`auditLogs` is an ordinary, mutable PostgreSQL table - any actor with direct
database access (not through the application) could alter or delete rows,
and nothing in the application layer would detect that. There is no
append-only constraint, hash chaining, or write-once storage. Do not
describe the audit log as tamper-evident or immutable in any context where
that claim would be relied upon (e.g. a compliance or incident-response
review) unless that capability is actually added later.
