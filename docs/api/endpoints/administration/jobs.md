# Jobs endpoints

Base path: `/api/jobs`. Router-wide `authenticate`; capability applied
per-route. Scheduled-job architecture (cron schedules, what each job does):
[../../../architecture/overview.md](../../../architecture/overview.md).

## GET /api/jobs
**Capability:** `JOB_EXECUTE`

**Response:** array of `{ cle, label, description, module, executionCapability }`
for every registered job - `executionCapability` tells the client exactly
which capability *that specific job* needs to run (see below).

**Notes:** this handler has no `try/catch` at all - an unexpected error
here surfaces as Express's default error page, not this module's usual
error shape.

## GET /api/jobs/historique
**Capability:** `JOB_EXECUTE`

**Request:** query `jobCle`, `module`, `source` (`'manuel'|'cron'` -
anything else is ignored), `succes` (`'true'`/other), `page`, `pageSize`.

**Response:** paginated job execution history.

## POST /api/jobs/:cle/executer
**Capability:** `JOB_EXECUTE` at the route level, **plus a second,
per-job check inside the service**: it looks up that job's own
`executionCapability` from the registry and requires the caller's role to
carry it. Most jobs only need `JOB_EXECUTE` (already satisfied by the route
guard), but every backup/promotion job additionally requires
`SYSTEM_ADMIN_OPERATION`:

| Job key | Module | `executionCapability` |
|---|---|---|
| `accords_expiration` | M1 | `JOB_EXECUTE` |
| `accords_alertes` | M1 | `JOB_EXECUTE` |
| `courriers_criticite` | M4 | `JOB_EXECUTE` |
| `recommandations_retard` | M3 | `JOB_EXECUTE` |
| `backup_quotidien` | M10 | `SYSTEM_ADMIN_OPERATION` |
| `backup_hebdomadaire` | M10 | `SYSTEM_ADMIN_OPERATION` |
| `backup_mensuel` | M10 | `SYSTEM_ADMIN_OPERATION` |
| `backup_annuel` | M10 | `SYSTEM_ADMIN_OPERATION` |
| `backup_sync_nas` | M10 | `SYSTEM_ADMIN_OPERATION` |
| `courriers_criticite_snapshot` | M11 | `JOB_EXECUTE` |
| `rapport_mensuel` | M11 | `JOB_EXECUTE` |

**Request:** path param `cle` (job key from the table above).

**Response:** `{ cle, succes, resume, details?, dureeMs }` - persists an
execution record and an audit entry (`JOB_EXECUTE_MANUEL`/
`JOB_ECHEC_MANUEL`) either way.

**Important errors:** 403 `ROLE_INSUFFISANT` (caller lacks that specific
job's `executionCapability` - fixed message assumes
`SYSTEM_ADMIN_OPERATION` is always the stricter tier); 404 `JOB_INTROUVABLE`;
**502** if the job ran but failed internally (a deliberate structured
failure response, not an HTTP-level error - `resultat.succes === false`).
