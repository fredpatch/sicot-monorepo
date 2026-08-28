# Running SICOT locally with Docker Compose

How to run the full stack (client, api, postgres, ocr-service,
translate-service, libretranslate) on your own machine via
`docker-compose.yml`. This is an alternative to the native
`npm run dev` + separately-launched Python services workflow - use
whichever is more convenient; both hit the same code.

## 1. Prerequisites

- **Docker Desktop** installed and running (Windows: the whale icon in the
  system tray should say "Docker Desktop is running"). If it's not running,
  every `docker compose` command below fails with a connection error.
- Nothing else needs to be installed locally - no Node, Python, Postgres,
  or Tesseract on the host. Docker builds all of that inside containers.

## 2. First-time setup

From the repo root:

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```bash
DB_USER=sicot_user
DB_PASSWORD=<pick anything for local dev>
DB_NAME=sicot_db
JWT_SECRET=<any string, 32+ chars>
JWT_REFRESH_SECRET=<any different string, 32+ chars>
```

Everything else in `.env.example` (SMTP, DeepL, Personnel ANAC, Gemini) can
stay blank - those integrations just won't work locally, the app still runs.

`.env` is gitignored - never commit it.

## 3. Start everything

```bash
docker compose up --build -d
```

- `--build` forces a rebuild if Dockerfiles or `package.json`/
  `requirements.txt` changed since the last run. Safe to always include;
  Docker skips layers that haven't changed, so it's fast after the first run.
- `-d` runs in the background ("detached"). Drop it if you want logs to
  stream in your terminal instead (Ctrl+C stops everything in that case).

First run downloads base images and installs all dependencies - expect a
few minutes, especially for `ocr-service` (installs LibreOffice). Subsequent
runs are seconds.

## 4. Where things are

| Service           | URL                              | Notes                                                                               |
| ----------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| Client            | http://localhost:5173            | Vite dev server, hot reload on file save                                            |
| API               | http://localhost:3001/api/health | Express, `tsx watch` - restarts on file save                                        |
| OCR service       | http://localhost:5001/health     | Flask, no hot reload - see §6                                                       |
| Translate service | http://localhost:5002/health     | Flask, no hot reload - see §6                                                       |
| LibreTranslate    | http://localhost:5000            | The MT engine `translate-service` calls                                             |
| Postgres          | localhost:5432                   | Connect with any DB GUI (TablePlus, DBeaver...) using the `DB_*` values from `.env` |

Open **http://localhost:5173** in your browser - that's the app.

## 5. Everyday commands

```bash
# View logs (all services, live-tailed)
docker compose logs -f

# View logs for just one service
docker compose logs -f api
docker compose logs -f client

# Check what's running and its health
docker compose ps

# Stop everything, keep data (DB, uploads) intact
docker compose stop

# Start it back up later
docker compose start

# Stop AND remove containers (data in named volumes still persists)
docker compose down

# Stop and WIPE all data too (fresh DB next start) - destructive
docker compose down -v
```

## 6. Hot reload - what auto-refreshes, what doesn't

- **`client`** and **`api`**: full hot reload. The repo is bind-mounted into
  the container (`.:/app` in `docker-compose.yml`), so editing files on your
  laptop is picked up immediately - no rebuild needed.
- **`ocr-service`** and **`translate-service`**: the `main.py` file is
  bind-mounted too, but Waitress (the WSGI server they use) doesn't
  hot-reload on its own. After editing either service's `main.py`, restart
  it:
  ```bash
  docker compose restart ocr-service
  docker compose restart translate-service
  ```
- Changing a **`Dockerfile`**, **`package.json`**, or **`requirements.txt`**
  always needs a rebuild: `docker compose up --build -d`.

## 7. Database

Migrations run **automatically** every time the `api` container starts
(`command: sh -c "npm run db:migrate && npm run dev"` in
`docker-compose.yml`) - a fresh DB gets its schema before the server tries
to seed default rows into it. Re-running against an already-migrated DB is
a no-op, so you never need to do this by hand on a normal `up`.

```bash
# Only needed to force a re-run without restarting the container
docker compose exec api npm run db:migrate

# Open Drizzle Studio (DB browser in your normal browser)
docker compose exec api npm run db:studio

# Seed demo data
docker compose exec api npm run db:seed-demo

# Raw psql shell
docker compose exec postgres psql -U $DB_USER -d $DB_NAME
```

`db:generate` (create a new migration from schema changes) is easier run on
the host with plain `npm run db:generate --workspace=packages/server` if you
have Node installed there - it just writes files to
`packages/server/drizzle/`, no running DB needed. Either way works.

## 8. Troubleshooting

**"Cannot connect to the Docker daemon"**
Docker Desktop isn't running. Start it and wait ~20-30s before retrying.

**A port is already in use (5173, 3001, 5432, 5001, 5002, 5000)**
Something else on your laptop is using it - likely a native
`npm run dev` or a Python service you forgot was still running. Stop that,
or edit the `ports:` mapping in `docker-compose.yml` for that service
(left side of the `:` is the host port).

**Client can't reach the API / network errors in the browser console**
(`vite proxy error: connect ECONNREFUSED ...:3001`)
Check `docker compose ps` - if `api` isn't healthy yet, the client's proxy
requests will fail. Give it a few seconds after `up`, or check
`docker compose logs api` for a crash. If `api` exited right after
printing `relation "parametres" does not exist`, you're on an image built
before migrations ran automatically on startup - `docker compose up --build -d`
to pick up the current `docker-compose.yml`.

**LibreTranslate: `curl http://localhost:5000/` returns 404 "Not Found"**
Expected, not a bug - `LT_DISABLE_WEB_UI=true` disables the browsable
homepage at `/`, but the actual API endpoints still work. Check real
health with `curl http://localhost:5000/languages` (should list `en`/`fr`)
or `curl http://localhost:5002/health` (the `translate-service` wrapper -
look for `"libretranslate":{"disponible":true}`). First boot also spends
~20-30s downloading the fr/en language models before it starts listening;
`docker compose logs libretranslate` shows "Loaded support for 2
languages!" once that's done.

**Changed `packages/shared` types aren't showing up**
The `shared` package isn't a separate container - client/api build it as
part of their own dev process from the bind-mounted source, so this should
just work. If it doesn't, `docker compose restart api client`.

**Something is clearly broken and you just want a clean slate**

```bash
docker compose down -v   # wipes DB + uploads - you'll lose local data
docker compose up --build -d
docker compose exec api npm run db:migrate
```

## 9. Related docs

- [`docs/deployment-documentation.md`](../deployment-documentation.md) - the
  generic Docker/Compose/CI-CD pattern this was built from.
- [`docs/deployment/production-guide.md`](production-guide.md) - staging and
  production deployment (different Compose files, different concerns).
