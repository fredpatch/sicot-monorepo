# Installation & Bootstrap

How to get a SICOT environment running from a fresh checkout. This covers
getting the code running - for staging/production deployment procedures see
[deployment.md](./deployment.md).

Two supported dev workflows exist side by side in this repository: native
(host) and Docker Compose. Both hit the same code; pick whichever is more
convenient. Runtime wiring for both is also described in
[../architecture/runtime-topology.md](../architecture/runtime-topology.md#development) -
this document focuses on the operator steps to get there, not the topology.

## 1. Native (host) development

**Verdict: partially supported.** The database, API, and client run fully
natively. OCR and translation have real native gaps (below).

### Prerequisites

- **PostgreSQL ≥ 15** (native install, or any reachable instance).
- **Node.js 20** - CI (`.github/workflows/ci.yml`) and both
  `packages/server/Dockerfile` / `packages/client/Dockerfile` pin Node 20
  (`node:20-alpine`). No `engines` field exists in any `package.json`, and
  there is no `.nvmrc`, so this is a reference/toolchain version rather
  than an enforced minimum - but it's the only version actually exercised
  by CI and the Docker images, so use it to match them.
- **Python 3.11**, only if you intend to run `ocr-service` and/or
  `translate-service` natively (their Docker images use `python:3.11-slim`;
  nothing enforces this version for a native install).
- **Tesseract 5** and **LibreOffice**, only for native OCR (see below).
- LibreTranslate has **no native install path documented in this repo** -
  see below.

### Install dependencies

```bash
npm install
```

Root `package.json` declares npm workspaces (`packages/*`), so this installs
all four packages' dependencies in one pass.

### Build the shared package first

`packages/client/vite.config.ts` resolves `@sicot/shared` from its built
(`dist/`) output, which is CommonJS - if it isn't built yet, Vite can
misresolve it as ESM with no exports. `dist/` is gitignored, so it does not
exist on a fresh clone, and the root `npm run dev` script does **not** build
it for you (only `npm run build` does, via
`build --workspace=packages/shared && ...`). Run once before first `npm run
dev`, and again after pulling changes to `packages/shared`:

```bash
npm run build --workspace=packages/shared
# or, to keep it rebuilding on change while you work:
npm run dev --workspace=packages/shared
```

This step is not documented in the root README - see Findings.

### Database initialization

```bash
psql -U postgres -f scripts/setup-db.sql
```

Creates role `sicot_user`, database `sicot_db` (UTF8, `fr_FR.UTF-8`
collation), the `unaccent` extension, and a `french_unaccent` text-search
config. **Note:** this script hardcodes the role's password to a value that
does not match the `DATABASE_URL` example in `packages/server/.env.example`
- reconcile the two manually when configuring your `.env` (see Findings;
no actual value is reproduced here).

Then configure environment and run migrations:

```bash
cp packages/server/.env.example packages/server/.env
# edit packages/server/.env - see configuration-reference.md

npm run db:generate   # only if you changed the schema; see migrations.md
npm run db:migrate
```

### Required local services

- **PostgreSQL** - required. `packages/server/src/db/index.ts` reads
  `DATABASE_URL` with a non-null assertion; the server will not start
  without it.
- **OCR service** (`packages/ocr-service`) - optional at boot. The server
  checks reachability once at startup and only logs a warning if it's down
  (`packages/server/src/index.ts`); document upload/OCR features simply
  won't work until it's reachable.
  - Native run: `python packages/ocr-service/main.py`. Its `TESSERACT_CMD`
    and `LIBREOFFICE_CMD` defaults are **hardcoded Windows paths from one
    developer's machine** (`packages/ocr-service/main.py`) - anyone else
    running natively must set both env vars to point at their own local
    Tesseract 5 and LibreOffice installs. There is no `.env.example` for
    `ocr-service`.
- **translate-service** (`packages/translate-service`) - optional; server
  degrades gracefully if unreachable (see
  [monitoring-and-health.md](./monitoring-and-health.md)). Native run:
  `python packages/translate-service/main.py` (reads
  `packages/translate-service/.env.example`).
- **LibreTranslate** - the engine `translate-service` calls. **No native
  install path is documented anywhere in this repo** - the only place it's
  launched is the `libretranslate/libretranslate` Docker image. Full native
  translation testing therefore still needs Docker (or a self-managed
  LibreTranslate instance outside this repo's tooling) even though
  `translate-service` itself can run natively.

A convenience script exists to run just the Python/LibreTranslate pieces in
Docker while the API/client run natively:

```bash
npm run services:up      # docker compose up -d libretranslate translate-service ocr-service
npm run services:down
npm run services:restart
npm run services:logs
npm run services:status
```

### Startup order

1. PostgreSQL reachable.
2. `scripts/setup-db.sql` run once (first time only).
3. Migrations applied (`npm run db:migrate`).
4. `npm run dev` (root) - starts server (`tsx watch`) and client (Vite)
   concurrently. OCR/translate/LibreTranslate can be started before or after
   this; the API does not block on them.

At server boot, in order: it seeds default `parametres` rows (idempotent),
verifies the SMTP connection (non-fatal if it fails), checks OCR
reachability (non-fatal), then registers the four `node-cron` jobs - see
[scheduled-jobs.md](./scheduled-jobs.md).

```bash
npm run dev
# API  : http://localhost:3001
# App  : http://localhost:5173
```

## 2. Docker development

Summarized here against the audited `docker-compose.yml`.

### Services started

| Service              | Build vs. image                              | Port           |
| --------------------- | --------------------------------------------- | -------------- |
| `postgres`            | image `postgres:16`                           | `5432:5432`    |
| `libretranslate`      | image `libretranslate/libretranslate:latest`  | `5000:5000`    |
| `translate-service`   | build `packages/translate-service/Dockerfile` | `5002:5002`    |
| `ocr-service`         | build `packages/ocr-service/Dockerfile`       | `5001:5001`    |
| `api`                 | build `packages/server/Dockerfile`, `target: dev` | `3001:3001` |
| `client`               | build `packages/client/Dockerfile`, `target: dev` | `5173:5173` |

Only `postgres` has a Docker healthcheck (`pg_isready`) in the dev compose
file; `api` depends on it with `condition: service_healthy`. `api` also
depends on `ocr-service`/`translate-service` but only with
`condition: service_started` (no health gate).

### Volumes

`postgres_dev_data`, `libretranslate_dev_data`, `sicot_uploads` (mounted at
`/sicot/documents` in `api`). `api` and `client` also bind-mount the repo
root (`.:/app`) for hot reload, with an anonymous `node_modules` volume to
avoid the host's `node_modules` shadowing the container's.

### Environment-file expectations

`docker-compose.yml` interpolates `${DB_USER}`, `${DB_PASSWORD}`,
`${DB_NAME}`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and others from a root
`.env` file (copy from `.env.example`) - see
[configuration-reference.md](./configuration-reference.md) for the full
inventory.

### Database initialization

Fully automatic. The `api` service's command is overridden to run
`npm run db:migrate && npm run dev` on every container start - a fresh
database has no tables, and the server would otherwise crash trying to seed
default parameter rows. The migration step is idempotent
(`onConflictDoNothing`), so repeated container restarts are safe.
`scripts/setup-db.sql` is **not** used in the Docker path - the official
Postgres image creates the role/database itself from `POSTGRES_USER` /
`POSTGRES_PASSWORD` / `POSTGRES_DB`.

```bash
docker compose up --build -d
docker compose logs -f api      # watch migration + boot logs
```

## 3. Initial application bootstrap

Bootstrap (creating the first Super Admin) is **API-driven, not CLI-driven**,
and is intentionally public/unauthenticated because no user exists yet to
authenticate:

- `GET /api/bootstrap/status` - reports whether the system has already been
  initialized.
- `POST /api/bootstrap/init` - creates the first `super_admin` user.

Both are mounted at `/api/bootstrap` before all other API routes.

**How "already initialized" is determined and guarded:** the system is
considered initialized once at least one user with `role = 'super_admin'`
exists. This is checked twice - once in the controller (returns `403
SYSTEME_DEJA_INITIALISE` immediately if already initialized) and again
inside the service, immediately before the insert, to close a race between
the two checks. A separate check rejects a matricule that's already in use.

**Validation before creation:** matricule, nom, prénom, email, password, and
password confirmation are all required; email format is checked; password
must meet a minimum length and complexity policy enforced server-side. On
success, the password is hashed (bcrypt), the user is created directly
active with no first-login OTP challenge, and an audit log entry
(`BOOTSTRAP_SUPER_ADMIN_CREE`, module M10) is written -see
[../security/audit-and-traceability.md](../security/audit-and-traceability.md).

**Client behavior:** the client checks `/api/bootstrap/status` on every app
load and redirects to a dedicated bootstrap screen whenever no super admin
exists yet - the application is unusable until this step completes.

No credentials are printed by this process, and none are reproduced here.

There is a separate, unrelated `db:seed-demo` script
(`npm run db:seed-demo`, workspace `packages/server`) that seeds demo
business data (organisations, accords, courriers, missions, documents, and
incidentally some users) for local development only - it refuses to run
when `NODE_ENV=production`. It is **not** part of the bootstrap flow and is
never invoked by any deployment script or CI workflow.

## What this document is not

Staging and production deployment - compose files, images, nginx, TLS,
GitHub Actions, rollout sequencing - are covered in
[deployment.md](./deployment.md), not here.
