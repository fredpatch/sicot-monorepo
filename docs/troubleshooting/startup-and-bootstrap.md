# Startup & Bootstrap

Failures getting the API/client running at all, and creating the first
Super Admin. Setup steps themselves:
[../operations/installation-bootstrap.md](../operations/installation-bootstrap.md).

## Symptom: API process exits or never listens

### Likely causes
- `DATABASE_URL` unset - `packages/server/src/db/index.ts` reads it with a
  non-null assertion; the process throws immediately without it.
- Postgres unreachable at that URL (wrong host/port, container not up yet,
  wrong credentials).
- `packages/shared` not built yet in native dev - the server itself doesn't
  depend on shared's build output at runtime the way the client does, but a
  broken/missing `dist/` can still surface as confusing type/import errors
  if you're running from source without a prior `npm run build --workspace=packages/shared`.

### Checks
```bash
# Is a DATABASE_URL actually set in this shell/container?
node -e "console.log(!!process.env.DATABASE_URL)"

# Native dev: is Postgres reachable at all?
psql "$DATABASE_URL" -c "select 1;"

# Docker dev: is postgres healthy?
docker compose ps postgres

# Server boot logs (Docker)
docker compose logs api
```

### Safe corrective actions
- Confirm `packages/server/.env` exists and was copied from
  `packages/server/.env.example` (native dev).
- In Docker dev, confirm root `.env` exists with `DB_USER`/`DB_PASSWORD`/
  `DB_NAME` set - `docker-compose.yml` interpolates `DATABASE_URL` from
  those for the `api` service.
- Wait for `postgres`'s healthcheck to pass before assuming the API is
  broken - `api`'s dev/staging/prod compose definitions all gate on
  `condition: service_healthy` for `postgres`, so a slow-starting database
  can look like an API failure at first glance.

### Escalate when
Postgres is confirmed healthy and reachable, credentials are confirmed
correct, and the process still won't boot - this points at something not
covered here (e.g. a code-level regression), not configuration.

---

## Symptom: server starts but immediately logs warnings about SMTP or OCR

### Likely causes
This is expected, not a failure. SMTP connection verification and the OCR
reachability check at boot are both **non-fatal** - both were designed to
warn and continue, per
[../operations/monitoring-and-health.md](../operations/monitoring-and-health.md).

### Checks
```bash
docker compose logs api | grep -iE "smtp|ocr"
```

### Safe corrective actions
If email or document OCR features are actually needed, see
[documents-and-ocr.md](./documents-and-ocr.md) for OCR-specific diagnosis,
or confirm `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are set (see
[../operations/configuration-reference.md](../operations/configuration-reference.md)).
Otherwise, no action needed - the server is running correctly.

### Escalate when
Not applicable - this is normal degraded-but-running behavior, not an
incident by itself.

---

## Symptom: client loads but every API call fails

### Likely causes
- `CORS_ORIGIN` doesn't match the client's actual origin - the browser
  blocks the response before your code even sees it.
- Wrong `VITE_API_PROXY_TARGET` in native/dev Vite config, or the API isn't
  actually listening on the port the client expects.
- API process is down while client (a static asset server) is still up -
  common in Docker since they're separate containers with independent
  healthchecks.

### Checks
```bash
# Is the API actually reachable at all?
curl -i http://localhost:3001/api/health

# Browser DevTools -> Network tab: look for a CORS error specifically
# (distinct from a connection-refused or 401/403 error)

# Docker: is the api container even running?
docker compose ps api
```

### Safe corrective actions
Confirm `CORS_ORIGIN` matches the exact scheme+host+port the browser is
using - see
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md)
for why this must be an exact origin match, not a wildcard. Do not widen
CORS just to make an error disappear without confirming the origin is
actually correct first.

### Escalate when
The origin is confirmed correct, the API responds directly via `curl`, but
the browser still fails - this points at something browser/cookie-specific;
see [authentication-and-session.md](./authentication-and-session.md).

---

## Symptom: `POST /api/bootstrap/init` fails

### Likely causes
- `403 SYSTEME_DEJA_INITIALISE` - a `super_admin` user already exists. This
  is the guard working as intended, not a bug.
- `400` validation errors - missing field, invalid email format, password
  too short/insufficiently complex, or password/confirmation mismatch.
- `MATRICULE_EXISTANT` - the chosen matricule is already taken.

### Checks
```bash
curl -s http://localhost:3001/api/bootstrap/status
```
Confirms whether the system considers itself initialized before you try
again.

### Safe corrective actions
If `initialise: true` and you legitimately need another super admin, that
user must be created a different way (bootstrap is deliberately single-use)
- this is outside the scope of a first-run problem. If `initialise: false`
and the request still fails, re-check the request body against the
validation rules in
[../operations/installation-bootstrap.md](../operations/installation-bootstrap.md#3-initial-application-bootstrap).

### Escalate when
`initialise: false`, the request body is confirmed valid, and the endpoint
still errors - check server logs for the underlying DB error (e.g.
connection issue) rather than assuming the bootstrap logic itself is wrong.

---

## Symptom: `POST /api/bootstrap/init` succeeds but the client won't move past the bootstrap screen

### Likely causes
The client checks `/api/bootstrap/status` on every app load and gates the
whole UI on it - a stale client-side cache or a load that happened before
the write was committed can show this transiently.

### Checks
```bash
curl -s http://localhost:3001/api/bootstrap/status
```

### Safe corrective actions
Hard-refresh the client. If `/api/bootstrap/status` genuinely still returns
`initialise: false` after a confirmed-successful `init` call, treat this as
a real inconsistency worth investigating (see Escalate), not something to
work around by re-running bootstrap.

### Escalate when
`/api/bootstrap/status` and the actual database state disagree after a
hard refresh - do not attempt to bypass the check.

---

## Symptom: wrong port or origin configuration

### Likely causes
- `PORT` overridden unexpectedly (default `3001`).
- `CORS_ORIGIN` not updated after changing the client's dev port or
  deployment domain.
- Native dev vs. Docker dev running simultaneously and colliding on the
  same host ports.

### Checks
```bash
# What port is the API actually bound to? (from its own boot log line)
docker compose logs api | grep -i "démarrée sur"

# Is something else already using the port?
# (adjust the port number to match your setup)
```

### Safe corrective actions
Set `PORT` and `CORS_ORIGIN` explicitly rather than relying on defaults
once more than one environment might be running on the same machine. Full
variable reference:
[../operations/configuration-reference.md](../operations/configuration-reference.md).

### Escalate when
Ports and origins are confirmed correct and isolated, and the mismatch
persists.
