# Deployment Infrastructure - Reusable Documentation

This document describes a complete, reproducible deployment strategy -
extracted from this project's actual working setup - for a monolithic web
app (Node/Express-style API + a static-built SPA client + Postgres) shipped
to a single VPS via Docker Compose and GitHub Actions/GHCR.

**Purpose:** let an AI agent (or a human) stand up the same infrastructure
for a _different_ project - ongoing or brand new - by following this as a
checklist/playbook, substituting the placeholders. It is not project-specific
prose; every name that's specific to _this_ project is marked as a
placeholder to replace.

**When this strategy fits:** a single app (or a small number of services),
one VPS, a Postgres database, moderate traffic, a small team, and a
preference for "boring, inspectable infrastructure" over managed
PaaS/Kubernetes. If the target project needs autoscaling, multi-region, or a
large services mesh, treat this as a starting point, not the final answer.

---

## 0. Architecture at a glance

```text
Developer pushes to `main`
        │
        ▼
GitHub Actions "CI" workflow (every push + PR)
  → typecheck, build, test
        │
        ▼
GitHub Actions "Publish Docker Images" workflow (push to main only)
  → builds multi-stage Dockerfiles → pushes to GHCR (private)
        │
        ▼
GitHub Actions "Deploy Production" workflow (MANUAL trigger only)
  → SSHes into the VPS → pulls new images → runs DB migrations
    → recreates containers via Docker Compose
        │
        ▼
VPS: Docker Compose stack
  Nginx (TLS termination, reverse proxy)
    ├── client container (static SPA, served by its own Nginx)
    ├── api container (Node/Express, runs migrations before listening)
    └── postgres container (private, not exposed to the internet)
```

Three environments, same shape, increasing fidelity:

| Environment    | Where it runs                                               | Purpose                                           | Config                       |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------- | ---------------------------- |
| **Local**      | Developer machine, Docker Compose                           | Day-to-day dev, hot reload                        | `docker-compose.yml`         |
| **Staging**    | Same VPS or a separate box, or even the developer's machine | Full production-shaped smoke test before shipping | `docker-compose.staging.yml` |
| **Production** | The real VPS                                                | Live traffic                                      | `docker-compose.prod.yml`    |

**Core principle: the VPS never builds anything.** GitHub Actions builds
images once, in CI; the VPS only pulls and runs. This keeps the VPS simple,
keeps builds reproducible, and means a "deploy" is just "pull a new tag and
restart containers," not "rebuild from source under load."

---

## 1. Prerequisites checklist

Before starting, gather/decide:

- [ ] App name / slug (used for image names, compose project name, directory name) → `<APP_SLUG>`
- [ ] A VPS (Hostinger, DigitalOcean, Hetzner, etc.) running Ubuntu LTS, with root or sudo SSH access
- [ ] A domain name you control (or a placeholder/temporary one - see §7)
- [ ] A GitHub repository with Actions enabled
- [ ] Decide the DB engine (this doc assumes Postgres; swap the image if different)
- [ ] Decide whether staging runs on the same VPS (different port) or a separate box - this doc assumes same-VPS, different port, since that's what was validated here

---

## 2. Repository layout

Reproduce this shape (rename `packages/server`/`packages/client` if the target project has a different structure - a single-app repo without workspaces still uses the same Dockerfile/Compose/Actions _pattern_, just without the `-w <package>` workspace flags):

```text
<repo-root>/
  docker-compose.yml            # local dev
  docker-compose.staging.yml    # staging (full prod-shape, local ports)
  docker-compose.prod.yml       # production (pulls prebuilt GHCR images)
  .env.example                  # local dev env template (committed)
  .env.prod.example             # production env template (committed, no real secrets)
  .env.staging                  # staging env (gitignored, local-only)
  nginx/
    nginx.conf                  # optional shared snippets
    staging.conf                # staging reverse proxy (HTTP only, local)
    prod.conf                   # production reverse proxy (HTTPS + ACME)
  packages/server/Dockerfile    # multi-stage: base → dev / build → prod
  packages/client/Dockerfile    # multi-stage: base → dev / build → prod (static)
  packages/client/nginx.conf    # nginx conf baked into the client's own prod image
  scripts/
    deploy-staging.sh
    deploy-prod.sh
    decrypt-backup.mjs          # only if you adopt the backup encryption pattern, §9
  .github/workflows/
    ci.yml
    docker-publish.yml
    deploy-prod.yml
  docs/deployment/
    production-guide.md         # project-specific runbook (domain, IP, real values)
```

---

## 3. Multi-stage Dockerfiles

One Dockerfile per deployable unit (API, client). Both follow the same
shape: a shared `base` stage installs dependencies once, then `dev`/`build`/
`prod` stages branch off it. This keeps dev and prod using the _exact same_
dependency install, avoiding "works in dev, breaks in prod" drift.

### 3.1 API/server Dockerfile

```dockerfile
# ── Base ──────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Add any native deps your server needs at runtime here, e.g. a headless
# browser for PDF generation, or a DB client for backup tooling:
#   RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz \
#     ca-certificates ttf-freefont postgresql16-client
# ENV PUPPETEER_SKIP_DOWNLOAD=true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
# If using npm workspaces with a shared types/utils package, copy its
# package.json too so `npm ci` resolves the whole workspace:
COPY packages/shared/types/package.json ./packages/shared/types/
RUN npm ci

# ── Development ───────────────────────────────────
FROM base AS dev
COPY . .
WORKDIR /app/packages/server
CMD ["npm", "run", "dev"]

# ── Build ──────────────────────────────────────────
FROM base AS build
COPY . .
RUN npm run build -w packages/shared/types && npm run build -w packages/server

# ── Production ─────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
# Repeat any runtime-only native deps from `base` here too - this is a
# SEPARATE base image, nothing carries over automatically.
COPY --from=build /app/packages/server/dist ./dist
# Copy ONLY what prod actually needs to run - not the whole repo. Common
# gotcha: if your compiled code loads any non-.ts asset (a logo, a template,
# a migrations folder) via a path relative to the repo layout, you MUST
# explicitly COPY that asset here too, at the exact resolved path - see §11.
COPY --from=build /app/packages/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/server/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 3.2 Client/frontend Dockerfile (static SPA)

```dockerfile
# ── Base ──────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/shared/types/package.json ./packages/shared/types/
RUN npm ci

# ── Dev ────────────────────────────────────────────
FROM base AS dev
COPY . .
WORKDIR /app/packages/client
CMD ["npm", "run", "dev", "--", "--host"]

# ── Build ─────────────────────────────────────────
FROM base AS build
COPY . .
RUN npm run build -w packages/shared/types && npm run build -w packages/client

# ── Prod (served by Nginx, not Node) ───────────────
FROM nginx:alpine AS prod
COPY --from=build /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`packages/client/nginx.conf` (the client's _own_ internal server, distinct
from the reverse-proxy Nginx in front of everything - see §5):

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA client-side routing fallback
    }
}
```

**Rule of thumb:** every stage should only `COPY` what it needs. `dev`
copies the whole repo because it needs source + hot reload. `build` copies
the whole repo because it needs source to compile. `prod` copies _only_
compiled output + runtime deps - never source, never devDependencies,
never the whole repo.

---

## 4. Docker Compose - three files, one shape

### 4.1 Local dev (`docker-compose.yml`)

Builds from source, mounts the repo as a volume for hot reload, exposes
every port directly (no reverse proxy needed locally).

```yaml
name: <APP_SLUG>

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - '5432:5432' # exposed for a local DB GUI - never do this in staging/prod
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
      target: dev
    volumes:
      - .:/app
      - /app/node_modules # anonymous volume: don't let the host bind-mount shadow the container's own node_modules
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

  client:
    build:
      context: .
      dockerfile: packages/client/Dockerfile
      target: dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - '5173:5173'
    environment:
      NODE_ENV: development
      VITE_API_PROXY_TARGET: http://api:3000 # dev server proxies /api to the api CONTAINER, not host localhost
    depends_on:
      - api

volumes:
  postgres_dev_data:
```

**Gotcha to carry forward:** when the frontend dev server runs _inside_
Docker, `localhost` inside that container means the client container
itself, not the API container. Any dev-server API proxy config must target
the API service's Compose network name (`http://api:3000`), not
`localhost:3000`.

### 4.2 Staging (`docker-compose.staging.yml`)

Same shape as production (builds `prod`-target images, same reverse-proxy
pattern) but **builds locally instead of pulling from a registry**, and
exposes a single port on `localhost` instead of using real DNS/TLS. This is
the "does the actual production Docker image work" gate before anything
touches the real registry or VPS.

```yaml
name: <APP_SLUG>_staging

services:
  postgres_staging:
    image: postgres:16
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}_staging
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    networks: [staging_net]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER} -d ${DB_NAME}_staging']
      interval: 10s
      timeout: 5s
      retries: 5

  api_staging:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
      target: prod
    shm_size: '512mb' # see §11 - headless-browser-in-Docker workloads need this
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres_staging:5432/${DB_NAME}_staging
      PORT: 3000
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:4001}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres_staging:
        condition: service_healthy
    networks: [staging_net]
    healthcheck:
      test:
        [
          'CMD-SHELL',
          'node -e "fetch(''http://localhost:3000/api/health'').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  client_staging:
    build:
      context: .
      dockerfile: packages/client/Dockerfile
      target: prod
    networks: [staging_net]
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3

  nginx_staging:
    image: nginx:alpine
    ports:
      - '4001:80'
    volumes:
      - ./nginx/staging.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      api_staging: { condition: service_healthy }
      client_staging: { condition: service_healthy }
    networks: [staging_net]

networks:
  staging_net:
    driver: bridge

volumes:
  postgres_staging_data:
```

`nginx/staging.conf` - plain HTTP, no TLS, proxies both API and client:

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://api_staging:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://client_staging:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Gotcha:** container healthchecks should target `127.0.0.1`, not
`localhost` - some Alpine images resolve `localhost` to `::1` first and the
service isn't listening on IPv6, causing false-negative healthchecks.

### 4.3 Production (`docker-compose.prod.yml`)

Pulls prebuilt images from the registry (never builds), adds `restart:
unless-stopped`, real healthchecks gating startup order, and TLS via a host
Certbot + bind-mounted certs.

```yaml
name: <APP_SLUG>_prod

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    networks: [prod_net]
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER} -d ${DB_NAME}']
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/${GHCR_OWNER}/<APP_SLUG>-api:${APP_VERSION:-latest}
    shm_size: '512mb'
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      PORT: 3000
      CORS_ORIGIN: ${CORS_ORIGIN}
      JWT_SECRET: ${JWT_SECRET}
      # ...every other secret the app needs, sourced from .env.prod
    depends_on:
      postgres: { condition: service_healthy }
    networks: [prod_net]
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD-SHELL',
          'node -e "fetch(''http://localhost:3000/api/health'').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  client:
    image: ghcr.io/${GHCR_OWNER}/<APP_SLUG>-client:${APP_VERSION:-latest}
    networks: [prod_net]
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - certbot_webroot:/var/www/certbot:ro
    depends_on:
      api: { condition: service_healthy }
      client: { condition: service_healthy }
    networks: [prod_net]
    restart: unless-stopped

networks:
  prod_net:
    driver: bridge

volumes:
  postgres_prod_data:
  certbot_webroot:
```

**Design decisions worth keeping:**

- Postgres has **no `ports:` mapping** in staging/prod - it's reachable only
  on the internal Compose network, never from the public internet.
- `depends_on: condition: service_healthy` (not just plain `depends_on`)
  ensures Nginx doesn't start routing traffic to an API container that
  hasn't finished booting/migrating yet.
- `restart: unless-stopped` on every prod service - survives VPS reboots
  without manual intervention, but still respects an intentional `docker
compose stop`.
- Image tags default to `latest` but are overridable per-deploy via
  `${APP_VERSION}` - this is what makes rollback a one-line env change (§8).

---

## 5. Nginx - the single public entrypoint

**One reverse-proxy Nginx** sits in front of everything and is the only
container with public ports (`80`/`443`). It routes by path: `/api/*` →
the API container, everything else → the client container (which has its
_own_ internal Nginx serving the static build, from §3.2 - two different
Nginx configs, two different jobs, don't conflate them).

`nginx/prod.conf`:

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name PLACEHOLDER-DOMAIN.com www.PLACEHOLDER-DOMAIN.com;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;   # Certbot needs this reachable over plain HTTP
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name PLACEHOLDER-DOMAIN.com www.PLACEHOLDER-DOMAIN.com;

    ssl_certificate     /etc/letsencrypt/live/PLACEHOLDER-DOMAIN.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/PLACEHOLDER-DOMAIN.com/privkey.pem;

    location / {
        proxy_pass http://client:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;   # raise if the app handles file uploads
    }
}
```

Replace every `PLACEHOLDER-DOMAIN.com` with the real domain once DNS is
live (§7). If `www.<domain>` is the canonical hostname, point
`ssl_certificate`/`ssl_certificate_key` at the `www.` cert path and redirect
the apex to it (or vice versa) - pick ONE canonical hostname, don't serve
both as equally valid.

---

## 6. CI/CD - three separate GitHub Actions workflows

Keep these as **three distinct workflows with distinct triggers**, not one
big pipeline. This is the single most important structural decision in this
whole doc: it means "code is pushed" and "code is running in production"
are two genuinely separate events, and the second one requires a deliberate
human action.

### 6.1 `ci.yml` - validate every push and PR

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

### 6.2 `docker-publish.yml` - build + push images, automatic on push to `main`

```yaml
name: Publish Docker Images

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  IMAGE_OWNER: ${{ github.repository_owner }}

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test

  publish:
    runs-on: ubuntu-latest
    needs: verify
    steps:
      - uses: actions/checkout@v4
      - id: image-owner
        run: echo "owner=$(echo "$IMAGE_OWNER" | tr '[:upper:]' '[:lower:]')" >> "$GITHUB_OUTPUT"
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: packages/server/Dockerfile
          target: prod
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ steps.image-owner.outputs.owner }}/<APP_SLUG>-api:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ steps.image-owner.outputs.owner }}/<APP_SLUG>-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: packages/client/Dockerfile
          target: prod
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ steps.image-owner.outputs.owner }}/<APP_SLUG>-client:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ steps.image-owner.outputs.owner }}/<APP_SLUG>-client:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      # Optional but recommended: fail-open vulnerability scan (exit-code: "0"
      # means "report but don't block" - flip to "1" once the project is
      # mature enough to actually gate on it)
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ steps.image-owner.outputs.owner }}/<APP_SLUG>-api:${{ github.sha }}
          format: table
          exit-code: '0'
          severity: CRITICAL,HIGH
```

Both images get tagged with the immutable commit SHA _and_ `latest` - the
SHA tag is what rollback pins to (§8), `latest` is the convenience default.

### 6.3 `deploy-prod.yml` - the only workflow that touches the VPS, `workflow_dispatch` ONLY

**This is deliberately not automatic.** Pushing to `main` builds and
publishes images (§6.2) but never deploys them. A human (or a separate,
explicit automation) must trigger this workflow to actually roll production
onto a new image.

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Image tag to deploy, usually a commit SHA. Leave empty to deploy the current commit.'
        required: false
        type: string

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production # gate this on required reviewers in repo settings for a manual-approval step

    steps:
      - uses: actions/checkout@v4

      - name: Resolve version
        run: |
          if [ -n "${{ inputs.version }}" ]; then
            echo "APP_VERSION=${{ inputs.version }}" >> "$GITHUB_ENV"
          else
            echo "APP_VERSION=${{ github.sha }}" >> "$GITHUB_ENV"
          fi

      - name: Copy deployment files
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          source: 'docker-compose.prod.yml,nginx/prod.conf,scripts/deploy-prod.sh'
          target: '/opt/<APP_SLUG>'
          overwrite: true

      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1.2.0
        env:
          APP_VERSION: ${{ env.APP_VERSION }}
          GHCR_OWNER: ${{ github.repository_owner }}
          GHCR_USERNAME: ${{ secrets.GHCR_USERNAME }}
          GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          envs: APP_VERSION,GHCR_OWNER,GHCR_USERNAME,GHCR_TOKEN
          script: |
            set -e
            cd /opt/<APP_SLUG>
            echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
            OWNER_LC=$(echo "$GHCR_OWNER" | tr '[:upper:]' '[:lower:]')
            if grep -q '^APP_VERSION=' .env.prod; then
              sed -i "s/^APP_VERSION=.*/APP_VERSION=$APP_VERSION/" .env.prod
            else
              echo "APP_VERSION=$APP_VERSION" >> .env.prod
            fi
            if grep -q '^GHCR_OWNER=' .env.prod; then
              sed -i "s/^GHCR_OWNER=.*/GHCR_OWNER=$OWNER_LC/" .env.prod
            else
              echo "GHCR_OWNER=$OWNER_LC" >> .env.prod
            fi
            chmod +x scripts/deploy-prod.sh
            ./scripts/deploy-prod.sh

      # Optional: post a notification (Discord/Slack) on success/failure so
      # the team doesn't have to babysit the Actions tab.
      - name: Notify - success
        if: success()
        run: |
          curl -sS -H "Content-Type: application/json" \
            -d "{\"content\": \"✅ **<APP_NAME>** deployed to production - commit \`${{ env.APP_VERSION }}\`, triggered by ${{ github.actor }}.\"}" \
            "${{ secrets.DISCORD_WEBHOOK_URL }}"
      - name: Notify - failure
        if: failure()
        run: |
          curl -sS -H "Content-Type: application/json" \
            -d "{\"content\": \"❌ **<APP_NAME>** production deploy FAILED - commit \`${{ env.APP_VERSION }}\`. ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"}" \
            "${{ secrets.DISCORD_WEBHOOK_URL }}"
```

**Why three workflows, not one:** it lets you push freely (fast feedback,
CI + image publish on every merge) without ever risking an accidental
production rollout. Deploying is always a deliberate, auditable, named
action in the Actions tab - and with `environment: production` plus
required reviewers configured in repo settings, it can require a second
person's approval before it runs.

---

## 7. The deploy script (`scripts/deploy-prod.sh`)

This is what actually runs on the VPS. Idempotent, safe to re-run, and the
_only_ place migrations get triggered in production.

```bash
#!/bin/bash
set -e

echo "Deploying production..."

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
ENV_FILE=${ENV_FILE:-.env.prod}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it on the VPS before deploying."
  exit 1
fi

echo "Pulling prebuilt images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull api client nginx postgres

echo "Starting database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm api npm run db:migrate

echo "Restarting application services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "Cleaning dangling images..."
docker image prune -f

echo "Production deployed - $(date)"
```

The staging equivalent (`scripts/deploy-staging.sh`) is the same shape but
**builds locally** instead of pulling, since staging validates the Docker
image build itself, not just the running container:

```bash
#!/bin/bash
set -e

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.staging.yml}
ENV_FILE=${ENV_FILE:-.env.staging}

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE."; exit 1; }

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres_staging
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm api_staging npm run db:migrate
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "Staging deployed - http://localhost:4001"
```

**Migrations run inside a throwaway container** (`run --rm api ...`), not
inside the long-lived API container's own startup - this keeps migration
failures loud and separate from "did the app start," and means a failed
migration doesn't leave a half-started API container running against a
half-migrated schema.

---

## 8. Rollback

Because every image is tagged with an immutable commit SHA (§6.2),
rollback is a one-line change, no rebuild required:

```bash
# On the VPS, or via the Deploy Production workflow's version input:
APP_VERSION=<previous-known-good-sha> ./scripts/deploy-prod.sh
```

**Practice to adopt:** record the last known-good SHA somewhere durable
(a pinned issue, a `RELEASES.md`, or just the Discord/Slack deploy
notification history) after every successful production deploy - so
"rollback to before this broke" is a lookup, not a `git log` archaeology
session under pressure.

---

## 9. Secrets and environment files

| File                                                             | Committed?          | Contains                                                                    |
| ---------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `.env.example`                                                   | Yes                 | Local dev template, fake/placeholder values only                            |
| `.env.prod.example`                                              | Yes                 | Production template, fake/placeholder values only                           |
| `.env`                                                           | **No** (gitignored) | Real local dev secrets                                                      |
| `.env.staging`                                                   | **No** (gitignored) | Real staging secrets                                                        |
| `/opt/<APP_SLUG>/.env.prod` (on the VPS, not in the repo at all) | **No**              | Real production secrets - created manually on the VPS, never touches GitHub |

GitHub Actions secrets needed (repo settings → Secrets and variables →
Actions, ideally scoped to a `production` environment with required
reviewers):

```text
PROD_HOST          # VPS IP or hostname
PROD_USER          # SSH deploy user (non-root, key-auth only)
PROD_SSH_KEY       # private key for that user
GHCR_USERNAME      # GitHub username/bot for docker login on the VPS
GHCR_TOKEN         # PAT with read:packages, used by the VPS to pull private images
DISCORD_WEBHOOK_URL  # optional, deploy notifications
```

`GITHUB_TOKEN` (auto-provided) is enough for the _publish_ workflow's
`packages: write` push - it's the VPS-side _pull_ that needs a separate PAT
with `read:packages`, since the VPS isn't running inside GitHub's own
Actions runner context.

**Never**: commit `.env.prod` or `.env.staging`, expose Postgres publicly,
or let the VPS hold a GHCR token with more than `read:packages`.

---

## 10. Domain and TLS (Let's Encrypt via Certbot, webroot method)

1. **DNS**: point the domain at the VPS's public IP.

   ```text
   A      <domain>       <VPS_PUBLIC_IP>
   CNAME  www            <domain>
   ```

   (or two `A` records for apex + `www` - pick one pattern, remove any
   stale default records from the VPS provider before requesting a cert.)

2. **Set the app's CORS/canonical origin** in `.env.prod`:

   ```bash
   CORS_ORIGIN=https://www.<domain>
   ```

3. **Fill in the real domain** in `nginx/prod.conf`, replacing every
   `PLACEHOLDER-DOMAIN.com`.

4. **Start Nginx before requesting the cert** (it needs to serve the ACME
   webroot challenge over plain HTTP first):

   ```bash
   cd /opt/<APP_SLUG>
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx
   ```

5. **Issue the certificate** (Certbot installed directly on the VPS host,
   not in a container, so it can write to a path Nginx's container reads
   via bind mount):

   ```bash
   sudo certbot certonly --webroot \
     -w /var/lib/docker/volumes/<compose-project>_certbot_webroot/_data \
     -d www.<domain> \
     -d <domain>
   ```

   Find the actual webroot volume path with `docker volume ls` if the
   compose project name differs from the guess above.

6. **Restart the stack** so Nginx picks up the new cert:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

7. **Verify**:
   ```bash
   curl -I https://www.<domain>
   curl https://www.<domain>/api/health
   ```

**Gotcha:** if `/.well-known/acme-challenge/*` returns the SPA's
`index.html` instead of the ACME token, the _client_ container's catch-all
route (`try_files $uri $uri/ /index.html`) is winning instead of the
reverse-proxy Nginx's ACME location block - confirm the reverse-proxy
config is actually the one loaded:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec nginx nginx -T | grep -A8 -B4 acme
```

Force-recreate the container if it's stale (`up -d --force-recreate nginx`).

Certbot auto-renewal is handled by the systemd timer/cron Certbot installs
itself on the VPS host - confirm it exists (`systemctl list-timers |
grep certbot`) rather than assuming.

**Temporary domain pattern:** if the final domain isn't chosen yet, use any
domain you already control (a `.cloud`/`.xyz` throwaway, a subdomain of an
existing property) to validate the whole HTTPS flow end-to-end. When the
real domain is purchased, repeat steps 1–6 for the new domain and keep the
temporary one around for staging/pre-deploy checks instead of discarding it.

---

## 11. Recurring gotchas worth designing around from day one

These are lessons from real incidents, listed so the same mistakes don't
repeat on a new project:

1. **`process.cwd()`-relative asset paths break silently between dev and
   prod.** If server code loads a non-code asset (a logo, a template, a
   font) via a path resolved relative to the current working directory, it
   will resolve differently in a dev checkout vs. a slim production image
   that only copies compiled output. **Prefer paths resolved relative to
   the source file itself** (e.g. `import.meta.url`-based in ESM) over
   `process.cwd()`-based paths, and if an asset is genuinely needed at
   runtime, `COPY` it into the prod stage explicitly at whatever path the
   code expects - don't assume "it works locally" means "it'll work in the
   container."

2. **Headless-browser-in-Docker workloads (Puppeteer/Playwright/PDF
   generation) need `--disable-dev-shm-usage` and/or a larger `shm_size`.**
   Docker's default `/dev/shm` is 64MB; Chromium can crash silently under
   that. Set `shm_size: "512mb"` (or higher) on any service that launches a
   real browser, and pass `--disable-dev-shm-usage` in the launch args
   regardless - cheap insurance either way.

3. **`docker-publish.yml` running on push does NOT mean the change is
   live.** Only `deploy-prod.yml`'s manual trigger rolls the VPS onto a new
   image. It is very easy to assume "I pushed, so it's deployed" - it
   isn't, by design (§6.3). Confirm with `docker ps` on the VPS (check the
   image tag and container age) rather than assuming a push reached
   production.

4. **Container healthchecks should target `127.0.0.1`, not `localhost`** -
   some Alpine-based images resolve `localhost` to `::1` (IPv6) first and
   nothing's listening there, causing a healthy service to report
   unhealthy.

5. **Dockerized dev servers must proxy to the Compose service name, not
   host `localhost`.** `VITE_API_PROXY_TARGET=http://api:3000`, not
   `http://localhost:3000` - inside a container, `localhost` is that
   container.

6. **Diagnosing a container-only failure without container logs is
   guessing, not diagnosis.** If something breaks only in staging/prod and
   never locally, the fastest real path to a fix is `docker compose logs
<service> --tail=200` (or equivalent) on the actual failing environment
   - not a plausible-sounding theory based on what's "usually" the cause.
     A well-reasoned guess that turns out wrong still costs a full deploy
     cycle to disprove; real logs are faster.

7. **Migrations run in a throwaway container, separate from app startup**
   (§7) - this makes a broken migration a loud, isolated failure instead of
   a half-started app silently serving against the wrong schema.

8. **Never expose Postgres's port in staging/prod Compose files.** It's
   fine (even useful) locally for a DB GUI; it should never appear in
   `docker-compose.staging.yml` or `docker-compose.prod.yml`.

---

## 12. Optional extensions (adopt only if the target project needs them)

These were built for this project but are genuinely optional - don't
implement them by default, only if the new project has the same need:

- **Encrypted, rotated database backups** (nightly cron inside the API
  container, `pg_dump` piped through AES-256-GCM before touching disk,
  Grandfather-Father-Son retention, a scoped download-only access token
  separate from normal login sessions for an offsite mirror script). Adopt
  if the project handles data where "we lost a day" or "we lost everything"
  is a real business risk, not just an inconvenience.
- **Manual OTP/activation fallback** when outbound email isn't configured
  yet - useful for early-stage rollout before SMTP is fully set up, so
  account activation isn't blocked on an email provider decision.
- **A `Corbeille`/Trash + soft-delete pattern with a distinct role tier**
  for destructive actions - an application-layer pattern, not
  infrastructure, but pairs naturally with "this deployment is now handling
  real customer data" maturity.

---

## 13. Checklist for standing this up on a new project

- [ ] Pick `<APP_SLUG>` and `<APP_NAME>`, substitute everywhere in this doc
- [ ] Write `packages/server/Dockerfile` and `packages/client/Dockerfile` (§3)
- [ ] Write `docker-compose.yml` (local), validate: `docker compose up --build -d`
- [ ] Write `docker-compose.staging.yml` + `nginx/staging.conf`, validate via `scripts/deploy-staging.sh`
- [ ] Write `docker-compose.prod.yml` + `nginx/prod.conf` (with `PLACEHOLDER-DOMAIN`)
- [ ] Write `scripts/deploy-prod.sh` and `scripts/deploy-staging.sh`
- [ ] Write `.env.example` and `.env.prod.example` (commit these, real files stay untracked)
- [ ] Set up the three GitHub Actions workflows (§6)
- [ ] Create GitHub repo secrets + a `production` environment with required reviewers
- [ ] Provision the VPS: Docker + Compose, non-root deploy user, SSH key auth, UFW (22/80/443 only), fail2ban
- [ ] Create `/opt/<APP_SLUG>/.env.prod` on the VPS by hand from the example
- [ ] Point DNS at the VPS, issue the Certbot cert (§10), fill in real domain in `nginx/prod.conf`
- [ ] Run `deploy-prod.sh` once manually via SSH to confirm the whole chain before relying on the Actions workflow
- [ ] Trigger `Deploy Production` from Actions, confirm `docker ps` shows the new image tag and a fresh container age
- [ ] Smoke test: health endpoint, login/auth flow, one core user journey, HTTPS certificate validity
- [ ] Record the deployed commit SHA somewhere durable for future rollback reference
