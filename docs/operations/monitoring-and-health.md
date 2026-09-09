# Monitoring & Health

Current observability and operational health checks - what actually exists
today, and what does not. This document distinguishes three levels of
"healthy" throughout: **process alive**, **service reachable**, and
**dependency healthy** - conflating them overstates what a given check
proves.

## Health endpoints

| Endpoint | Depth | What it actually checks |
|---|---|---|
| `GET /api/health` (main API) | **Shallow - process alive only** | Returns a static `{status: 'ok', version, service, timestamp}` unconditionally. No database query, no dependency check of any kind. |
| `GET /health` (`ocr-service`) | **Semi-deep** | Calls `pytesseract.get_tesseract_version()` to confirm the local Tesseract binary actually works - checks its own runtime dependency, not any upstream service. |
| `GET /health` (`translate-service`) | **Deep - dependency reachability** | Actively calls LibreTranslate's `/languages` endpoint and reports whether it responded - a real upstream-reachability check. |
| `GET /api/bootstrap/status` | Not a health check | Reports whether the first Super Admin has been created; used by the client to route between setup and login. |

**Do not treat `GET /api/health` as a readiness check** - it does not
validate the database connection, OCR reachability, SMTP, or any other
dependency. It only proves the Express process is up and answering HTTP
requests. See [installation-bootstrap.md](./installation-bootstrap.md) and
[deployment.md](./deployment.md) for how Docker actually gates on this
endpoint despite its shallowness.

## Docker healthchecks

| Service | Command | Depth |
|---|---|---|
| `postgres` (all 3 compose files) | `pg_isready -U ... -d ...` | Deep - real DB readiness |
| `libretranslate` (staging/prod) | HTTP GET `/languages` | Deep - real reachability |
| `translate` / `translate_staging` | `curl` against its own `/health` | Deep - hits the deep endpoint above |
| `ocr` / `ocr_staging` | `curl` against its own `/health` | Semi-deep - hits the Tesseract-version check above |
| `api` / `api_staging` | `node -e "fetch('http://localhost:3001/api/health')..."` | **Shallow** - hits the shallow endpoint above; Docker considers the API "healthy" even if Postgres, SMTP, or OCR are unreachable, as long as the process itself is up |
| `client` / `client_staging` | `wget` against `/` | Shallow - just confirms nginx/static server responds |

**Docker "healthy" for the `api`/`api_staging` container currently means
only that the API process responds to an HTTP request - not that
PostgreSQL or any external dependency is ready.** This is a liveness signal,
not a readiness probe; do not read Compose/Swarm "healthy" status as proof
the database or any dependency is reachable.

The **dev** compose file (`docker-compose.yml`) only defines a healthcheck
for `postgres` - `api`, `client`, `ocr-service`, and `translate-service`
have none in dev.

`nginx` / `nginx_staging` have no healthcheck of their own; they instead
gate their own startup on `api`/`client` reporting healthy via
`depends_on: { condition: service_healthy }` - which, per the table above,
means nginx's start is gated on the API process merely being alive, not on
its dependencies being reachable.

nginx configs themselves (`nginx/prod.conf`, `nginx/staging.conf`) contain
no health-check-specific directives at all.

## API startup logging

`packages/server/src/index.ts` logs boot progress with plain `console.log` /
`console.warn` calls - there is **no structured logger** (no winston, no
pino; confirmed absent from every package's dependencies). On a successful
boot it logs: the listening URL, the active `NODE_ENV`, the SMTP
verification result (success or a non-fatal warning), the OCR reachability
check result (success or a non-fatal warning), and a confirmation line from
each of the four cron-registration functions as they start. Request logging
uses `morgan` (`dev` format in development, `combined` in other
environments), writing to stdout - not a structured or file-based logger
either.

## Current operational visibility

- **Docker logs** - `docker compose logs -f <service>` is the primary way
  to see what's happening; nothing is captured beyond Docker's default
  stdout/stderr driver (no `logging:` override in any compose file).
- **API logs** - `console.*` and `morgan`, stdout only, no rotation, no
  aggregation.
- **Job execution history** - the `jobExecutions` table and its admin-UI
  surface (`GET /api/jobs/historique`) is the main place scheduled and
  manual job outcomes (including backups) become visible - see
  [scheduled-jobs.md](./scheduled-jobs.md).
- **Audit logs** - the general audit trail records security/administrative
  events (bootstrap, backup runs, exports, etc.) - see
  [../security/audit-and-traceability.md](../security/audit-and-traceability.md)
  for what it does and does not guarantee; it is a compliance/traceability
  log, not a monitoring system.

## External-service failure handling

All outbound integrations are caught gracefully rather than crashing the
process:

- **SMTP** - connection verification at boot is wrapped in try/catch and
  only logs a warning on failure; the server continues to run without
  email working. Individual send failures during a bulk operation (e.g.
  accord-expiry alert emails) are caught per-recipient so one failure
  doesn't abort the whole batch.
- **OCR** - the boot-time reachability check never throws; runtime
  extraction calls catch transport errors and re-throw them as typed,
  user-facing business errors instead of crashing.
- **Personnel ANAC** - all calls are wrapped in try/catch and translated
  into typed errors, including a dedicated branch for connection-refused /
  timeout conditions.
- **Gemini** - generation calls are wrapped in try/catch with a
  quota-exhaustion fallback; the monthly-report job treats the AI narrative
  step as best-effort and continues producing the PDF/Excel report even if
  Gemini fails.
- **LibreTranslate** - not called directly by the Node API; fronted by the
  Python `translate-service`, whose own `/health` endpoint probes it
  without crashing on failure.

None of these failure paths were found to crash the Express process - all
are caught at the call site and surfaced as typed errors, warnings, or
degraded functionality.

## Missing observability

The following do not exist anywhere in this project today, confirmed by
checking every package's dependencies for the relevant tooling:

- **Centralized log aggregation** (e.g. ELK, Loki) - none.
- **Metrics / Prometheus** - no metrics endpoint, no `prom-client` or
  equivalent dependency.
- **Distributed tracing** - none.
- **Alerting** - no alerting system of any kind; nothing pages or notifies
  anyone when a job, backup, or health check fails (Discord notifications
  exist only for the production *deploy workflow's* own success/failure,
  not for runtime health).
- **Uptime monitoring** - no external or internal uptime-monitoring
  integration.
- **Error tracking** - no Sentry or equivalent; unhandled errors are only
  visible via container stdout.

This is a factual inventory of current state, not a product recommendation
- decisions about what to add belong to the project owner, not this
document.
