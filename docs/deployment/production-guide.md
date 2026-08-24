# SICOT — Production Deployment Runbook

Project-specific companion to [`docs/deployment-documentation.md`](../deployment-documentation.md)
(the generic playbook this infra was built from). This file has the real
values and the exact commands for *this* repo; the other file has the
reasoning and the reusable pattern.

## 1. Services in this stack

SICOT is five deployable units, not the two (`api` + `client`) the generic
doc assumes:

| Service     | Image               | What it is                                                   | Public? |
| ----------- | -------------------- | -------------------------------------------------------------- | ------- |
| `nginx`     | `nginx:alpine`        | TLS termination, reverse proxy — the only public container     | yes (80/443) |
| `client`    | `sicot-client`         | React SPA, served by its own internal Nginx                    | no (behind reverse proxy) |
| `api`       | `sicot-api`            | Express REST API                                                | no |
| `postgres`  | `postgres:16`          | Database                                                        | no |
| `ocr`       | `sicot-ocr`            | Python/Flask — Tesseract + LibreOffice + Poppler text extraction | no, internal only |
| `translate` | `sicot-translate`      | Python/Flask — wraps LibreTranslate (+ optional DeepL fallback) | no, internal only |
| `libretranslate` | `libretranslate/libretranslate` | Self-hosted MT engine `translate` talks to             | no, internal only |

`api` calls `ocr` and `translate` over the internal Compose network
(`OCR_SERVICE_URL`, `LIBRETRANSLATE_URL` — see `docker-compose.prod.yml`).
Neither is reachable from outside the VPS, by design.

## 2. Prerequisites specific to this project

- **Personnel ANAC integration** (`PERSONNEL_ANAC_BASE_URL`) points at
  `http://100.110.227.69:4005` — a Tailscale-internal address. The VPS
  needs to be joined to that Tailscale network (or the org's equivalent)
  for this integration to work in production; it will silently fail
  health/lookup calls otherwise. Confirm with ANAC IT before relying on it.
- **Gemini rapports-IA** (`GEMINI_API_KEY`) — per `.env.prod.example`,
  leave this unset in production until DG/RGPD sign off (see Sprint 11
  notes). The feature degrades gracefully without it.
- **DeepL** — `DEEPL_ENABLED=false` by default; LibreTranslate (self-hosted,
  in-stack) is the only translation engine until DeepL is approved.
- **LibreOffice inside the `ocr` image** is large (~600MB+) — first build
  and first pull will be slow. This was a deliberate tradeoff (see the
  "Python services" decision in this deployment's setup) for full
  reproducibility over image size.

## 3. Local dev

```bash
cp .env.example .env    # fill in DB_USER/DB_PASSWORD/JWT secrets etc.
docker compose up --build -d
```

- Client: http://localhost:5173
- API: http://localhost:3001/api/health
- OCR: http://localhost:5001/health
- Translate: http://localhost:5002/health
- Postgres: exposed on 5432 for a local DB GUI

## 4. Staging (full prod shape, local ports)

```bash
cp .env.prod.example .env.staging   # adjust DB_*/JWT_* for staging
./scripts/deploy-staging.sh
# → http://localhost:4001
```

This builds every image locally (doesn't touch GHCR) — it's the gate that
proves the actual production Dockerfiles work before anything is published.

## 5. VPS provisioning (one-time)

1. Ubuntu LTS VPS, Docker + Compose plugin installed, non-root deploy user
   with SSH key auth, UFW allowing only 22/80/443, fail2ban.
2. `mkdir -p /opt/sicot && cd /opt/sicot`
3. Create `.env.prod` by hand from `.env.prod.example` — **never** copy this
   file through git or CI.
4. If Personnel ANAC integration is needed in prod, join the VPS to the
   Tailscale network first (§2).

## 6. GitHub setup (one-time)

Repo secrets (Settings → Secrets and variables → Actions), ideally under a
`production` environment with required reviewers:

```text
PROD_HOST, PROD_USER, PROD_SSH_KEY
GHCR_USERNAME, GHCR_TOKEN   (PAT with read:packages)
DISCORD_WEBHOOK_URL         (optional)
```

## 7. First deploy

```bash
# On the VPS, once, to confirm the whole chain before trusting the Actions workflow:
cd /opt/sicot
git archive --format=tar HEAD | tar -x   # or scp the 3 files the workflow copies
./scripts/deploy-prod.sh
```

Then from GitHub: Actions → **Deploy Production** → Run workflow. Confirm
with `docker compose -f docker-compose.prod.yml ps` that all 7 services
report healthy and the image tags match the deployed SHA.

## 8. Domain and TLS

Follow §10 of `docs/deployment-documentation.md` verbatim, substituting the
real domain for `PLACEHOLDER-DOMAIN.com` in `nginx/prod.conf` and
`.env.prod`'s `CORS_ORIGIN`.

## 9. Rollback

```bash
APP_VERSION=<previous-known-good-sha> ./scripts/deploy-prod.sh
```

Record the deployed SHA after every successful `Deploy Production` run
(the Discord notification history works, or a `RELEASES.md`).

## 10. Known gaps / follow-ups

- No automated test suite exists yet — CI's `verify` job type-checks and
  builds (`npm run build`) but doesn't run tests. Add one before treating
  CI green as a strong correctness signal.
- Puppeteer PDF export (`src/utils/pdf.ts`) needs `shm_size: "512mb"` on
  `api` — already set in all three Compose files; don't drop it if you
  restructure them.
