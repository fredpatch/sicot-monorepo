# Deployment & Health

Full deployment procedure and health-check depth reference:
[../operations/deployment.md](../operations/deployment.md) and
[../operations/monitoring-and-health.md](../operations/monitoring-and-health.md).
This document covers diagnosis only.

**Two distinctions to keep throughout:**
- **Repository-defined procedure vs. confirmed live infrastructure** - the
  compose files and scripts define what deployment *should* do; they are
  not proof that a given VPS is actually running SICOT right now.
- **Docker "healthy" for the `api`/`api_staging` service means only that
  the process responds to `/api/health` - not that PostgreSQL or any
  external dependency is ready.** This is a liveness check, not a
  readiness probe.

## Symptom: staging deploy script fails

### Likely causes
- `.env.staging` missing - `scripts/deploy-staging.sh` aborts early if it's
  absent, and no `.env.staging.example` template exists to copy from.
- Image build failure (all staging images are built locally, unlike
  production).
- `postgres_staging` never becomes healthy, so the script's
  `up -d --wait postgres_staging` step times out before migrations can run.

### Checks
```bash
ls .env.staging
docker compose -f docker-compose.staging.yml --env-file .env.staging \
  build
docker compose -f docker-compose.staging.yml --env-file .env.staging \
  ps postgres_staging
```
Run the script's steps individually (matching
[../operations/deployment.md](../operations/deployment.md#deployment-script---scriptsdeploy-stagingsh))
to isolate which step actually fails, rather than re-running the whole
script repeatedly.

### Safe corrective actions
Create `.env.staging` if missing (there is no template - reconstruct it
from `.env.example`/`.env.prod.example`'s variable names, per
[../operations/configuration-reference.md](../operations/configuration-reference.md)).
Fix the specific failing build/health step identified above before
retrying the full script.

### Escalate when
`.env.staging` is present and correct, images build successfully, and
`postgres_staging` is confirmed healthy, yet the script still fails.

---

## Symptom: production deploy workflow fails

### Likely causes
- Workflow secrets (`PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`,
  `GHCR_USERNAME`, `GHCR_TOKEN`) missing or invalid in GitHub repo/environment
  settings.
- SSH connectivity to the VPS failing.
- `.env.prod` missing on the VPS at `/opt/sicot/.env.prod` -
  `scripts/deploy-prod.sh` aborts if it's absent, and the workflow only
  edits two keys in place, it never creates the file from scratch.

### Checks
Review the GitHub Actions run logs directly - the workflow's SCP and SSH
steps will surface connection/auth failures explicitly. Do not attempt to
reproduce SSH/secrets issues locally; they're specific to the configured
GitHub Environment.

### Safe corrective actions
Confirm the required secrets exist in the `production` GitHub Environment
and that `/opt/sicot/.env.prod` exists on the VPS before re-running the
workflow. **Do not invent host-specific remediation steps beyond what
`scripts/deploy-prod.sh` and the workflow itself define** - if the failure
is host-specific infrastructure (DNS, firewall, VPS provisioning), that's
outside what this repository automates.

### Escalate when
Secrets and `.env.prod` are confirmed present and correct, and the workflow
still fails to connect or deploy - this needs direct investigation on the
target host, which is outside what this documentation can diagnose remotely.

---

## Symptom: GHCR pull/auth issue

### Likely causes
- `GHCR_TOKEN`/`GHCR_USERNAME` invalid or expired.
- `GHCR_OWNER` in `.env.prod` doesn't match the actual image namespace the
  images were published under.

### Checks
The workflow's `docker login ghcr.io` step in `deploy-prod.yml` will report
an authentication failure explicitly if the token is invalid.

### Safe corrective actions
Rotate/verify the GHCR token has the correct package-read scope. Confirm
`GHCR_OWNER` matches what `.github/workflows/docker-publish.yml` actually
published under.

### Escalate when
Credentials are confirmed valid and the owner name confirmed correct, and
pulls still fail.

---

## Symptom: container starts but Docker marks it unhealthy

### Likely causes
Depends entirely on which service - see the healthcheck depth table in
[../operations/monitoring-and-health.md](../operations/monitoring-and-health.md#docker-healthchecks).
`postgres`, `libretranslate`, and `translate*` have deep checks (a failure
there usually means a real dependency problem); `api`/`client` have
shallow checks (a failure there most likely means the process itself
crashed or never started, not that a dependency is down).

### Checks
```bash
docker compose ps
docker compose logs <service>
```

### Safe corrective actions
For a shallow-checked service (`api`, `client`) reporting unhealthy, look
at its own logs for a crash/startup error - the healthcheck itself isn't
testing dependencies, so don't assume a dependency is the cause. For a
deep-checked service, the healthcheck failure is itself meaningful
diagnostic information about that dependency.

### Escalate when
Logs show no obvious startup error and the container still fails its
healthcheck.

---

## Symptom: `/api/health` responds but dependencies are down

### Likely causes
This is expected, not a bug - `/api/health` is deliberately shallow (see
the distinction at the top of this document). A `200` from it proves only
that the Express process is answering HTTP requests.

### Checks
Check the specific dependency directly instead of relying on `/api/health`
for it:
```bash
docker compose ps postgres          # DB
curl -i http://localhost:5001/health  # OCR
curl -i http://localhost:5002/health  # translate-service (deep - checks LibreTranslate too)
```

### Safe corrective actions
Do not treat `/api/health` returning `200` as proof the system is fully
operational - diagnose the specific failing feature against its own
dependency directly, per the other troubleshooting documents in this
section.

### Escalate when
Not applicable directly - this is a diagnosis-technique note.

---

## Symptom: nginx routing or TLS issue

### Likely causes
- Wrong `location` matched (check `/`, `/api/`, `/uploads/` routing in
  `nginx/prod.conf` / `nginx/staging.conf`).
- TLS: `nginx/prod.conf` expects certificates at
  `/etc/letsencrypt/live/PLACEHOLDER-DOMAIN.com/...` - if the real domain
  was never substituted for the placeholder, or the certificate was never
  actually issued for that domain, TLS will fail.
- Staging has **no TLS at all** by design (plain HTTP only) - an HTTPS
  request to staging is not a bug, it's simply unsupported there.

### Checks
```bash
docker compose logs nginx    # or nginx_staging
curl -i http://localhost:8100/api/health   # staging, plain HTTP only
```

### Safe corrective actions
Confirm the placeholder domain has actually been replaced with a real one
in `nginx/prod.conf` before troubleshooting TLS further - see the next
symptom.

### Escalate when
The domain is confirmed correctly configured and certificates confirmed
present at the expected path, and nginx still fails to route or terminate
TLS correctly.

---

## Symptom: placeholder domain not replaced

### Likely causes
`nginx/prod.conf` and `.env.prod.example` both ship with the literal
placeholder `PLACEHOLDER-DOMAIN.com`. If a real production deployment is
being attempted with this placeholder still in place, TLS and routing will
not work correctly against a real domain.

### Checks
```bash
grep -n "PLACEHOLDER-DOMAIN" nginx/prod.conf
```

### Safe corrective actions
This must be replaced with the real domain as part of initial production
setup, along with issuing a matching certificate (see Certbot below) -
this is expected first-time setup work, not a bug. **No real domain is
invented or assumed anywhere in this documentation** - substituting the
correct value is the operator's responsibility with knowledge this
documentation doesn't have.

### Escalate when
Not applicable directly - this is a setup-completeness check.

---

## Symptom: Certbot prerequisite issue

### Likely causes
Certificate issuance/renewal is a **manual, host-level step** - there is no
certbot container or automation anywhere in this repository. A missing or
expired certificate is a host-provisioning gap, not an application bug.

### Checks
Check certificate presence/expiry directly on the VPS at the path nginx
expects (`/etc/letsencrypt/live/<domain>/`).

### Safe corrective actions
Issue/renew the certificate manually on the host, per whatever
Certbot-based procedure the operator has established outside this repo -
none is automated here to describe further.

### Escalate when
Always, if certificates are missing/expired - this is host-level work, not
something this documentation set can resolve.

---

## Symptom: Tailscale prerequisite issue

### Likely causes
The Personnel ANAC integration is only reachable over a specific Tailscale
network - nothing in this repository installs, joins, or manages
Tailscale. If the host isn't joined to that network, calls to that
integration will fail with a connection-level error.

### Checks
Confirm Tailscale connectivity from the host directly (outside any
application-level check) - this is infrastructure, not application
configuration.

### Safe corrective actions
Join the host to the required Tailscale network per organizational
procedure - outside anything this repository automates.

### Escalate when
Always - this is a network-provisioning prerequisite, not something
application troubleshooting resolves.

---

## Symptom: CORS origin mismatch after deployment

### Likely causes
`CORS_ORIGIN` wasn't updated to match the actual deployed domain/port after
a deployment (e.g. still pointing at a dev or previous-environment value).

### Checks
```bash
curl -i -H "Origin: https://<the real deployed origin>" \
  https://<domain>/api/health
```
Inspect the `Access-Control-Allow-Origin` response header.

### Safe corrective actions
Update `CORS_ORIGIN` in the relevant environment file to the exact deployed
origin - see
[authentication-and-session.md](./authentication-and-session.md#symptom-cors--credentials-misconfiguration)
for the general diagnosis pattern. Do not widen it beyond the exact origin
as a shortcut.

### Escalate when
The origin is confirmed exactly correct post-deployment and CORS errors
persist.

---

## Symptom: migration step failure during deploy

### Likely causes
See [database-and-migrations.md](./database-and-migrations.md#symptom-migration-succeeds-locally-but-fails-in-staging)
- the same reasoning applies to production. The deploy scripts run
migrations in a one-off container **before** restarting the rest of the
stack, so a migration failure here means the stack keeps running its
previous version rather than restarting into a broken schema state - this
is a safety property of the deploy sequence, not a separate bug to fix.

### Checks
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm --no-deps api npm run db:migrate
```
Run this step in isolation to see the actual migration error, matching
[../operations/deployment.md](../operations/deployment.md#production).

### Safe corrective actions
Diagnose the actual migration error (see
[database-and-migrations.md](./database-and-migrations.md)) before
re-running the full deploy script. Do not skip the migration step or force
the stack restart past a failed migration.

### Escalate when
The migration error is data-related (a real constraint conflict against
production data) rather than a connectivity issue - this needs a
deliberate data-migration decision, not a routine retry.
