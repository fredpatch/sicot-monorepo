# Deployment

The repository-defined staging and production deployment process. Runtime
topology (which services talk to which, and where) is documented in
[../architecture/runtime-topology.md](../architecture/runtime-topology.md);
this document focuses on the operator-facing procedure - what to run, in
what order, and what the repository does and does not automate.

A pre-existing, more narrative deployment playbook also exists at
[`docs/deployment/production-guide.md`](../deployment/production-guide.md)
and its generic companion
[`docs/deployment-documentation.md`](../deployment-documentation.md) - this
document is the canonical, re-audited reference; where the two differ,
trust this one and treat the other as historical context.

**Repository-defined procedure vs. confirmed live infrastructure:**
everything below describes what the repository is capable of doing. It is
**not** evidence that a live production VPS currently exists or is serving
traffic - there is no recorded deployed SHA, no infrastructure-as-code
state, and no live-infrastructure inventory anywhere in this repo.

## Staging

### Services (`docker-compose.staging.yml`)

| Service | Build vs. image |
|---|---|
| `postgres_staging` | image `postgres:16` |
| `libretranslate_staging` | image `libretranslate/libretranslate:latest` |
| `translate_staging` | **built locally** - `packages/translate-service/Dockerfile` |
| `ocr_staging` | **built locally** - `packages/ocr-service/Dockerfile` |
| `api_staging` | **built locally** - `packages/server/Dockerfile`, `target: prod` |
| `client_staging` | **built locally** - `packages/client/Dockerfile`, `target: prod` |
| `nginx_staging` | image `nginx:alpine` |

No GHCR references exist in this compose file - staging always builds
images on the host running it, even though `api_staging`/`client_staging`
use the same `prod` build target as production. This tier exists
specifically to prove the production build targets work before they're
published to GHCR.

### nginx / exposed port / TLS

`nginx_staging` publishes host port `8100:80` only, proxying `/api/` and
`/uploads/` to `api_staging:3001` and everything else to `client_staging:80`
(`nginx/staging.conf`). **No TLS in staging** - a single plain-HTTP `server
{ listen 80; }` block, no certificate configuration.

### Deployment script - `scripts/deploy-staging.sh`

Exact sequence:

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging build
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --wait postgres_staging
docker compose -f docker-compose.staging.yml --env-file .env.staging run --rm --no-deps api_staging npm run db:migrate
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --remove-orphans
```

The script aborts early if `.env.staging` is missing. No `.env.staging.example`
template is committed to the repo - see
[configuration-reference.md](./configuration-reference.md) findings.

### Sequence in plain terms

1. Rebuild every image locally.
2. Start only `postgres_staging` and wait for it to report healthy.
3. Run migrations in a one-off `api_staging` container, before anything else
   restarts.
4. Bring the rest of the stack up in place (`up -d --remove-orphans`) -
   this is a rolling in-place update, not a full `down` then `up`. There is
   no `docker compose down` step anywhere in the staging path.

### Persistent volumes (staging)

`postgres_staging_data`, `libretranslate_staging_data`,
`sicot_uploads_staging`. **No backup volume exists for staging** - unlike
production's `sicot_backups_prod`, local backup dumps in staging would live
inside the container's ephemeral filesystem rather than a named volume. See
[backups.md](./backups.md).

### Manual prerequisites (staging)

- No GitHub Actions workflow deploys staging automatically - it is entirely
  manual (someone runs `scripts/deploy-staging.sh` on a host with Docker).
- `.env.staging` must be created by hand; no template is committed.
- The default `CORS_ORIGIN` for staging is a Tailscale-range IP, consistent
  with other Tailscale references in this repo - implying the staging host
  is expected to be reachable over Tailscale, itself a manual join step not
  automated by anything in this repository.
- Docker/Docker Compose installation on the host is assumed, not automated.

## Production

### Services (`docker-compose.prod.yml`)

| Service | Image |
|---|---|
| `postgres` | `postgres:16` |
| `libretranslate` | `libretranslate/libretranslate:latest` |
| `translate` | `ghcr.io/${GHCR_OWNER}/sicot-translate:${APP_VERSION:-latest}` |
| `ocr` | `ghcr.io/${GHCR_OWNER}/sicot-ocr:${APP_VERSION:-latest}` |
| `api` | `ghcr.io/${GHCR_OWNER}/sicot-api:${APP_VERSION:-latest}` |
| `client` | `ghcr.io/${GHCR_OWNER}/sicot-client:${APP_VERSION:-latest}` |
| `nginx` | `nginx:alpine` |

No `build:` key exists anywhere in this file - production is entirely
pre-built registry images, none built on the VPS. These image names match
exactly what `.github/workflows/docker-publish.yml` pushes to GHCR on every
push to `main`.

### nginx / exposed port / TLS

`nginx` publishes `80:80` and `443:443` - the only container exposed to the
public internet. `nginx/prod.conf` defines two server blocks: port 80
redirects to HTTPS except for the ACME HTTP-01 challenge path
(`/.well-known/acme-challenge/`, served from a `certbot_webroot` volume);
port 443 terminates TLS using
`/etc/letsencrypt/live/PLACEHOLDER-DOMAIN.com/{fullchain,privkey}.pem` and
proxies `/` → `client`, `/api/` and `/uploads/` → `api:3001`.

`PLACEHOLDER-DOMAIN.com` is a literal placeholder string present in the
tracked config (`nginx/prod.conf`, `.env.prod.example`) - **no real
production domain exists in this repository.** A real deployment must
replace this string as part of setup.

### Certbot / TLS issuance

Configured for, but **not automated by**, this repository:
`docker-compose.prod.yml` mounts `/etc/letsencrypt` read-only and a
`certbot_webroot` volume into `nginx`, and nginx serves the ACME challenge
path from that webroot - but there is **no certbot container or service**
defined anywhere in the compose file, and no cron/systemd-timer definition
in the repo. Certificate issuance and renewal is a manual, host-level
Certbot step performed directly on the VPS (documented procedurally in
`docs/deployment-documentation.md`), outside of anything this repository
runs automatically.

### Deployment pipeline

Two layers: a GitHub Actions workflow that orchestrates, and a shell script
that does the actual work on the VPS.

**`.github/workflows/deploy-prod.yml`:**
- Trigger: `workflow_dispatch` only (manual), with an optional `version`
  input - **never runs automatically on push.**
- Runs under a GitHub `production` Environment - this supports a
  required-reviewer manual-approval gate, but whether that gate is actually
  configured is a GitHub repo-settings choice outside this file's content.
- Resolves `APP_VERSION` to the given input or the current commit SHA.
- Copies `docker-compose.prod.yml`, `nginx/prod.conf`, and
  `scripts/deploy-prod.sh` to `/opt/sicot` on the host identified by the
  `PROD_HOST`/`PROD_USER`/`PROD_SSH_KEY` secrets.
- SSHes in and: logs in to GHCR using `GHCR_USERNAME`/`GHCR_TOKEN`, writes
  the resolved `APP_VERSION` and lowercased `GHCR_OWNER` into `.env.prod` on
  the host, then runs `scripts/deploy-prod.sh`.
- Posts a Discord notification on success/failure via
  `DISCORD_WEBHOOK_URL`, if configured.
- Secret names referenced (values never appear in the repo): `PROD_HOST`,
  `PROD_USER`, `PROD_SSH_KEY`, `GHCR_USERNAME`, `GHCR_TOKEN`,
  `DISCORD_WEBHOOK_URL`.

**`scripts/deploy-prod.sh`** - exact sequence:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  pull api client ocr translate libretranslate nginx postgres
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up -d --wait postgres
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm --no-deps api npm run db:migrate
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up -d --remove-orphans
docker image prune -f
```

The script aborts if `.env.prod` is missing - it must exist at
`/opt/sicot/.env.prod` on the VPS before a first deploy; the workflow only
edits two keys in place, it does not create the file from scratch.
`.env.prod.example` (repo root) is the template, explicitly documented as
never belonging in the repo itself.

### Sequence in plain terms

1. Pull the named service images from GHCR.
2. Bring up only `postgres` and wait for it to report healthy.
3. Run migrations in a one-off `api` container, against the freshly-pulled
   image, before the rest of the stack restarts.
4. `up -d --remove-orphans` - in-place rolling update; no `down` step
   anywhere in the production path either.
5. `docker image prune -f` reclaims dangling image layers left behind by
   the pull.

### Persistent volumes (production)

| Volume | Mount | Survives redeploy |
|---|---|---|
| `postgres_prod_data` | `/var/lib/postgresql/data` on `postgres` | Database |
| `libretranslate_prod_data` | `/home/libretranslate/.local` on `libretranslate` | Downloaded language models |
| `sicot_uploads_prod` | `/sicot/documents` on `api` | Uploaded documents |
| `sicot_backups_prod` | `/sicot/backups/local` on `api` | Local backup dumps |
| `certbot_webroot` | `/var/www/certbot` on `nginx` | ACME challenge files |

`/etc/letsencrypt` is a host **bind mount** into `nginx`, not a named Docker
volume - certificates live on the VPS filesystem outside Compose's volume
lifecycle, so they are unaffected even by a `docker compose down -v`.

### Manual prerequisites (production)

Repository evidence points to all of the following being manual, host-level
steps, not automated by anything in this repo:

- VPS provisioning and Docker/Docker Compose installation.
- Firewall configuration - not referenced anywhere in compose/scripts/workflows.
- DNS pointing at the VPS - implied by the need to replace
  `PLACEHOLDER-DOMAIN.com` with a real value.
- Certbot certificate issuance and renewal (see above).
- Tailscale network join - the Personnel ANAC integration's default base
  URL is only reachable over a specific Tailscale network; nothing in this
  repo installs or joins Tailscale.
- GHCR authentication - performed inline by the workflow using secrets, but
  those secrets/PAT must be provisioned manually in GitHub repo settings.
- Creation of the `production` GitHub Environment's reviewer gate and the
  underlying secret values - both are GitHub repo-settings configuration,
  outside repo file content.
- First-time creation of `/opt/sicot/.env.prod` on the VPS - the deploy
  script hard-fails if it's absent.

**Do not invent values for any of the above** - none are recorded in this
repository, and none are assumed here.

### Rollback

**No automated rollback mechanism exists.** Neither deploy script nor any
GitHub Actions workflow contains a rollback, revert, or previous-version
restore step. The only lever available is manually re-running the `Deploy
Production` workflow with an older `version` input pointing at a
previously-published GHCR tag - that is a manual re-deploy of a known-good
version, not an automated rollback. Do not treat this document as
implying more than that.
