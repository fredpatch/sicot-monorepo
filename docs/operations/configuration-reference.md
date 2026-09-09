# Configuration Reference

Canonical inventory of environment variables consumed by SICOT, built from
the tracked `.env.example` files and direct code usage (`process.env`/
`os.environ` call sites). No secret **values** appear anywhere in this
document - names, consumers, and behavior only.

Sources: `.env.example`, `.env.prod.example` (repo root),
`packages/server/.env.example`, `packages/translate-service/.env.example`,
`docker-compose.yml`, `docker-compose.staging.yml`,
`docker-compose.prod.yml`. `packages/ocr-service` and `packages/client` have
no tracked `.env.example` file. There is also no tracked `.env.staging.example`

- see Findings.

Legend: **Declared** = present in a tracked `.env.example` file. **Read** =
actually consumed by code. A variable can be one without the other; both
cases are called out explicitly.

## Application / runtime

| Variable                | Consumer                                                                | Declared                                         | Required                                                                                                  | Sensitive | Note                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `packages/server/src/index.ts`, `middleware/auth.ts`, `db/seed-demo.ts` | Yes                                              | Optional, defaults `development`                                                                          | No        | Gates dev-only routes, cookie `secure` flag, and blocks `db:seed-demo` in production                                                            |
| `PORT`                  | `index.ts`                                                              | Yes                                              | Optional, default `3001`                                                                                  | No        | API listen port                                                                                                                                 |
| `CORS_ORIGIN`           | `index.ts`                                                              | Yes (root + prod example)                        | Optional, default `http://localhost:5173`; **no** default in `docker-compose.prod.yml` (must be supplied) | No        | See [../security/csrf-and-session-security.md](../security/csrf-and-session-security.md) for why this matters for CSRF/CORS posture             |
| `VITE_API_PROXY_TARGET` | `packages/client/vite.config.ts`                                        | **No** - only set inline in `docker-compose.yml` | Optional, default `http://localhost:3001`                                                                 | No        | Dev-only Vite proxy target; undocumented in a tracked example file                                                                              |
| `APP_URL`               | `modules/portal/services/portal.service.ts`                             | **No**                                           | Optional, default `http://localhost:5173`                                                                 | No        | Builds public portal download links sent by email - a wrong default in production would embed `localhost` links in outbound mail. See Findings. |

## Database

| Variable                            | Consumer                                                                              | Declared | Required                                                                             | Sensitive          | Note                                                                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Postgres container init + interpolated into `DATABASE_URL` in all three compose files | Yes      | Required (no compose fallback)                                                       | `DB_PASSWORD`: yes | Root-level `.env.example`/`.env.prod.example` model the DB connection as discrete parts                                                                                                                                                           |
| `DATABASE_URL`                      | `packages/server/src/db/index.ts`, `jobs/backup.ts`                                   | Yes      | **Required** - read with a non-null assertion; the process will not start without it | Yes                | `packages/server/.env.example` instead models this as one full connection string, for standalone (non-Docker) server runs - the two files describe the same concern two different ways; not a bug, but reconcile when configuring a native `.env` |

## JWT / session

| Variable                  | Consumer                                       | Declared | Required                          | Sensitive | Note                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------- | -------- | --------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`              | `utils/jwt.ts`                                 | Yes      | **Required** (non-null assertion) | Yes       | Signs/verifies access tokens                                                                                                                                                                                                                                                            |
| `JWT_REFRESH_SECRET`      | `utils/jwt.ts`                                 | Yes      | **Required** (non-null assertion) | Yes       | Signs/verifies refresh tokens                                                                                                                                                                                                                                                           |
| `JWT_EXPIRES_IN`          | Not read anywhere - `jwt.ts` hardcodes `"15m"` | Yes      | N/A                               | No        | **Declared but unused.** See Findings.                                                                                                                                                                                                                                                  |
| `JWT_REFRESH_EXPIRES_IN`  | Not read anywhere - `jwt.ts` hardcodes `"7d"`  | Yes      | N/A                               | No        | **Declared but unused.** See Findings.                                                                                                                                                                                                                                                  |
| `SESSION_TIMEOUT_MINUTES` | Not read anywhere in server code               | Yes      | N/A                               | No        | **Declared but unused** - carried forward from Phase 11.2; already documented as inert in [../security/csrf-and-session-security.md](../security/csrf-and-session-security.md) and [../security/security-checklist.md](../security/security-checklist.md). Still true as of this audit. |
| `OTP_EXPIRY_MINUTES`      | `utils/email.templates.ts`                     | **No**   | Optional, default `10`            | No        | Used but undocumented                                                                                                                                                                                                                                                                   |

Session/cookie mechanics themselves (dual-cookie model, `httpOnly`,
`sameSite`) are documented in
[../security/authentication.md](../security/authentication.md) and
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md),
not here.

## CORS

Covered above under `CORS_ORIGIN` - see
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md)
for the browser-origin reasoning; this doc only tracks the variable itself.

## SMTP

| Variable    | Consumer         | Declared | Required                                                                                                          | Sensitive | Note                          |
| ----------- | ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| `SMTP_HOST` | `utils/email.ts` | Yes      | Optional - `undefined` is passed to nodemailer if unset (OTP/notification emails then fail silently at send time) | No        |                               |
| `SMTP_PORT` | `utils/email.ts` | Yes      | Optional, default `587`; `465` enables `secure: true`                                                             | No        |                               |
| `SMTP_USER` | `utils/email.ts` | Yes      | Optional, no default                                                                                              | Yes       | Mailbox login                 |
| `SMTP_PASS` | `utils/email.ts` | Yes      | Optional, no default                                                                                              | Yes       | Mailbox password/app-password |
| `SMTP_FROM` | `utils/email.ts` | Yes      | Optional, default `SICOT <sicot@anac.ga>`                                                                         | No        |                               |

**Known duplication:** `packages/server/.env.example` declares the entire
SMTP block twice, with different placeholder content in each block. Since
`.env` files are parsed line-by-line, the later block silently wins if both
are ever filled in - confusing to read top-to-bottom. See Findings.

## Storage / uploads

| Variable         | Consumer                                                                             | Declared | Required                             | Sensitive | Note                                   |
| ---------------- | ------------------------------------------------------------------------------------ | -------- | ------------------------------------ | --------- | -------------------------------------- |
| `UPLOAD_DIR`     | `index.ts` (static file serving), `modules/document/services/documents.constants.ts` | Yes      | Optional, default `/sicot/documents` | No        |                                        |
| `TEMP_WATCH_DIR` | Not referenced anywhere in code                                                      | Yes      | N/A                                  | No        | **Declared but unused.** See Findings. |

## OCR

| Variable          | Consumer                           | Declared                                         | Required                                                                                        | Sensitive                                       | Note                                                                                       |
| ----------------- | ---------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `OCR_SERVICE_URL` | `packages/server/src/utils/ocr.ts` | Yes                                              | Optional, default `http://localhost:5001`                                                       | No                                              | Server → `ocr-service` HTTP base URL                                                       |
| `OCR_PORT`        | `packages/ocr-service/main.py`     | **No** - only set inline in `docker-compose.yml` | Optional, default `5001`                                                                        | No                                              | Undocumented; no `.env.example` exists for `ocr-service` at all                            |
| `TESSERACT_CMD`   | `packages/ocr-service/main.py`     | **No**                                           | Optional, but the built-in default is a **hardcoded Windows path from one developer's machine** | No (leaks a dev-machine path, not a credential) | Meaningless on Linux/Docker; every other environment must set it explicitly. See Findings. |
| `LIBREOFFICE_CMD` | `packages/ocr-service/main.py`     | **No**                                           | Optional, same hardcoded-dev-path issue as above                                                | No                                              | See Findings.                                                                              |

## Translation - LibreTranslate / DeepL / Gemini

| Variable                 | Consumer                                                                                                                                                            | Declared                                                                                                                                       | Required                                                          | Sensitive                                                | Note                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSLATE_SERVICE_URL`  | `packages/server/src/utils/traduction.ts` (the Node API's **only** client for `/translate`, `/translate/batch`, `/detect`, and engine `/health`)                    | **No** - absent from every tracked `.env.example`, and **not set on the `api`/`api_staging` service in any of the three docker-compose files** | Optional, default `http://localhost:5002`                         | No                                                       | **Confirmed configuration/runtime wiring defect** - see Findings. Not injected by Docker anywhere.                                                                                             |
| `LIBRETRANSLATE_URL`     | `packages/translate-service/main.py` (translate-service's own client to LibreTranslate) - **not read by `traduction.ts` or anywhere else in `packages/server/src`** | Yes (`packages/server/.env.example`, `packages/translate-service/.env.example`)                                                                | Optional, default `http://localhost:5000`                         | No                                                       | Set on the `api`/`api_staging` service in every compose file, but nothing in the Node API reads it - it is silently inert there. See Findings.                                                 |
| `LIBRETRANSLATE_API_KEY` | `packages/translate-service/main.py`                                                                                                                                | Yes                                                                                                                                            | Optional, default empty                                           | Possibly (if the LibreTranslate instance requires a key) |                                                                                                                                                                                                |
| `TRANSLATE_PORT`         | `packages/translate-service/main.py`                                                                                                                                | Yes                                                                                                                                            | Optional, default `5002`                                          | No                                                       |                                                                                                                                                                                                |
| `DEEPL_ENABLED`          | `packages/translate-service/main.py`                                                                                                                                | Yes                                                                                                                                            | Optional, default `false`                                         | No                                                       | The server itself instead reads a **DB parameter** `deepl_fallback_actif` for its own DeepL toggle - two independent switches for the same feature, in two different subsystems. See Findings. |
| `DEEPL_API_KEY`          | `packages/translate-service/main.py`                                                                                                                                | Yes                                                                                                                                            | Optional; raises an error if DeepL fallback is invoked without it | Yes                                                      |                                                                                                                                                                                                |
| `GEMINI_API_KEY`         | `modules/analytics/services/gemini.service.ts`, `scripts/gemini-smoke-test.ts`                                                                                      | Yes                                                                                                                                            | Optional - no runtime guard in `gemini.service.ts` itself         | Yes                                                      | Example files explicitly comment that this must not be enabled in production without DG/RGPD validation                                                                                        |
| `GEMINI_MODEL`           | `scripts/gemini-smoke-test.ts` only                                                                                                                                 | Yes                                                                                                                                            | Optional, default `gemini-2.5-flash`                              | No                                                       | Not read by the main runtime path (`gemini.service.ts` selects candidate models internally) - effectively only affects the standalone smoke-test script                                        |

## Personnel ANAC

| Variable                  | Consumer                                      | Declared | Required                                                                                                                                                                                   | Sensitive                                                                                              | Note                                                                                                             |
| ------------------------- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `PERSONNEL_ANAC_BASE_URL` | `packages/server/src/utils/personnel-anac.ts` | Yes      | Optional, but the committed default value is an **internal infrastructure detail present in tracked configuration example** (a real internal Tailscale-range IP, not a placeholder string) | Not a credential, but potentially sensitive operational metadata - discloses internal network topology | See Findings. Integration behavior and failure handling: [monitoring-and-health.md](./monitoring-and-health.md). |
| `PERSONNEL_ANAC_API_KEY`  | `personnel-anac.ts`                           | Yes      | Optional, default empty                                                                                                                                                                    | Yes                                                                                                    |                                                                                                                  |

## Backup / NAS

| Variable           | Consumer                                                      | Declared | Required                                          | Sensitive | Note                                                                                                    |
| ------------------ | ------------------------------------------------------------- | -------- | ------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `BACKUP_LOCAL_DIR` | `jobs/backup.ts`, `start/services/parameters-seed.service.ts` | Yes      | Optional, default `/sicot/backups/local`          | No        | Only a seed default - actual value is admin-editable at runtime via a DB parameter (`backup_local_dir`) |
| `BACKUP_NAS_DIR`   | `jobs/backup.ts`                                              | Yes      | Optional, default `/mnt/nas/sicot/backups`        | No        | Deliberately **not** DB-configurable - IT-managed mount, env-only by design                             |
| `PG_DUMP_PATH`     | `jobs/backup.ts`                                              | **No**   | Optional, default `pg_dump` (resolved via `PATH`) | No        | Used but undocumented                                                                                   |

Full backup behavior (what's backed up, retention, restore status):
[backups.md](./backups.md).

## Jobs / scheduling

No dedicated scheduling environment variables exist - cron cadences in
`packages/server/src/jobs/*` are hardcoded in code, not env-driven. See
[scheduled-jobs.md](./scheduled-jobs.md).

## Production / TLS / domain / deploy

| Variable                                                                                       | Consumer                                         | Declared                                                                                                | Required                                                  | Sensitive | Note                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| `GHCR_OWNER`                                                                                   | `docker-compose.prod.yml` image references       | Yes (`.env.prod.example`, committed default present)                                                    | Required for image pulls                                  | No        | Also rewritten in place on the VPS by the deploy workflow         |
| `APP_VERSION`                                                                                  | Same, image tags                                 | Yes, default `latest`                                                                                   | Optional                                                  | No        | Overridden with the deployed commit SHA by the deploy workflow    |
| `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, `GHCR_USERNAME`, `GHCR_TOKEN`, `DISCORD_WEBHOOK_URL` | `.github/workflows/deploy-prod.yml`              | GitHub Actions repo/environment secrets - **not** file-based, intentionally out of `.env.example` scope | Required (except the Discord webhook, used conditionally) | Yes, all  | CI/CD-only; never touch the running application's own environment |
| TLS/domain                                                                                     | `nginx/prod.conf`, `/etc/letsencrypt` bind mount | Not env-driven - hardcoded volume paths and a literal placeholder domain string in the nginx config     | N/A                                                       | No        | Domain itself otherwise only flows through `CORS_ORIGIN`          |

`.env.staging` is expected by `scripts/deploy-staging.sh`, but **no tracked
`.env.staging.example` exists** anywhere in the repo - undocumented by
omission for anyone setting up staging from scratch. See Findings.

## Placeholder domains - handling note

`nginx/prod.conf` and `.env.prod.example` both use the literal string
`PLACEHOLDER-DOMAIN.com`. This document and every other operations document
preserves that placeholder verbatim rather than inventing or guessing a real
production domain - no real domain is known to this documentation effort.

## New findings from this audit (not fixed - documentation only)

These are reported per instruction, not remediated in this phase.

1. **Confirmed configuration/runtime wiring defect: the Node API's
   translation client is never given a reachable URL in Docker.** The
   intended call chain is Node API → `translate-service` → LibreTranslate
   (`traduction.ts` calls `/translate`, `/translate/batch`, `/detect`, and
   `/health` - the exact routes `translate-service/main.py` implements; the
   Node API never calls LibreTranslate directly). `traduction.ts` reads
   only `TRANSLATE_SERVICE_URL`, with a fallback of `http://localhost:5002`.
   None of the three compose files (`docker-compose.yml`,
   `docker-compose.staging.yml`, `docker-compose.prod.yml`) set
   `TRANSLATE_SERVICE_URL` on the `api`/`api_staging` service - all three
   instead set `LIBRETRANSLATE_URL` there, a variable `traduction.ts` never
   reads (only `translate-service/main.py` reads `LIBRETRANSLATE_URL`, for
   its own separate call to LibreTranslate). Inside the `api` container,
   the unset variable's fallback (`localhost:5002`) resolves to the `api`
   container itself, which does not run a translate service on that port.
   **Impact:** in every Dockerized environment (dev, staging, production),
   server-initiated translation calls have no correctly-configured path to
   `translate-service` - this is a wiring defect in the tracked
   configuration, not a hypothetical or "likely" one. **Suggested
   remediation:** set `TRANSLATE_SERVICE_URL` on the `api`/`api_staging`
   service in all three compose files, pointing at the correct
   `translate-service` container host:port (mirroring how
   `LIBRETRANSLATE_URL` is already set on the `translate`/`translate_staging`/
   `translate-service` containers) - do not maintain two different variable
   names for the same concern. Not fixed in this phase per scope.
2. **`JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` declared but unused** -
   token lifetimes are hardcoded in `utils/jwt.ts` regardless of these
   variables. Impact: low (misleading, not insecure - the hardcoded values
   match the documented dual-cookie model in
   [../security/authentication.md](../security/authentication.md)).
   Suggested remediation: either wire them in or remove them from the
   example files.
3. **`SESSION_TIMEOUT_MINUTES` still declared but unused** - unchanged
   since Phase 11.2's audit.
4. **`TEMP_WATCH_DIR` declared but unused** - no code references it at all.
5. **SMTP block duplicated inside `packages/server/.env.example`** with
   different placeholder content in each copy - the second block silently
   wins if both are filled in. Suggested remediation: delete one block.
6. **`TESSERACT_CMD` / `LIBREOFFICE_CMD` default to a specific developer's
   Windows file paths** rather than being unset or Linux-appropriate.
   Harmless in Docker (the Dockerfile always sets them), but misleading for
   anyone trying native OCR on a different machine and mildly leaks a local
   username/path into source. Suggested remediation: default to `tesseract`
   / `soffice` (resolved via `PATH`) instead, matching how `PG_DUMP_PATH`
   already defaults to `pg_dump`.
7. **`DEEPL_ENABLED` (env, read by `translate-service`) and
   `deepl_fallback_actif` (DB parameter, read by the server) are two
   independent toggles for the same feature.** Impact: an operator could
   change one and reasonably assume DeepL fallback behavior changed
   end-to-end, when only half the system moved. Suggested remediation:
   pick one control surface.
8. **`APP_URL` used but absent from every tracked `.env.example`.** Impact:
   an operator following only the example files would not know this
   variable exists, and a missed override in production would embed
   `localhost` links in outbound portal-download emails. Suggested
   remediation: add it to `packages/server/.env.example` and
   `.env.prod.example` with a clear comment.
9. **`PERSONNEL_ANAC_BASE_URL`'s committed default is an internal
   infrastructure detail present in tracked configuration example files**
   (a real internal Tailscale-range IP, not a placeholder), across three
   tracked files (`.env.example`, `.env.prod.example`,
   `packages/server/.env.example`). Confirmed not a credential, but it is
   potentially sensitive operational metadata - it discloses internal
   network topology in a public-visible file. The IP itself is not
   reproduced anywhere in this documentation. Suggested remediation:
   replace it later with a placeholder-style default; this is a
   recommendation for the project owner to act on, not something changed
   in this documentation phase.
10. **No tracked `.env.staging.example`** exists, unlike `.env.example` and
    `.env.prod.example`. Suggested remediation: add one so staging setup
    doesn't depend on tribal knowledge of what `.env.prod.example` and
    `.env.example` jointly imply.
11. ~~Root README stated Node ≥ 22, while CI and both Dockerfiles pin Node 20.~~ **Corrected in Phase 11.6C** - the root README now states Node
    20 as the reference/toolchain version, matching CI and both
    Dockerfiles; nothing enforces either number (no `engines` field
    exists). See [installation-bootstrap.md](./installation-bootstrap.md).
