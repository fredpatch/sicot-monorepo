# 🏗️ SICOT – Architecture

## Monorepo Layout

```
sicot-monorepo/                     npm workspaces root
├── packages/
│   ├── client/     @sicot/client   React SPA (Vite)
│   ├── server/     @sicot/server   Express REST API
│   └── shared/     @sicot/shared   Shared TS types (minimal, grows over sprints)
├── docs/                           Project docs (PDF, DOCX, TASKS.md)
├── scripts/setup-db.sql            Initial DB setup
├── exploration-cache/              ← This knowledge base
└── tsconfig.base.json              Shared TS base (ES2022, NodeNext, strict)
```

## Client Stack

| Concern | Library | Version |
|---------|---------|---------|
| Framework | React | 18.3 |
| Build | Vite | 5.x |
| Language | TypeScript | 5.4, moduleResolution: Bundler |
| CSS | Tailwind CSS **v4** | @theme block, no tailwind.config.js |
| Routing | react-router-dom | v6 |
| Server state | TanStack Query | v5 |
| Forms | react-hook-form + zod | v7 + v3 |
| HTTP | Axios | v1.7, baseURL: /api, withCredentials: true |
| Animations | framer-motion | v12 |
| i18n | react-i18next | FR default, EN toggle |
| Icons | lucide-react | v1.21 |
| UI primitives | CVA (class-variance-authority) | Manually crafted — no shadcn CLI |
| Path alias | `@/` → `./src/` | vite.config.ts + tsconfig paths |

**Dev port**: 5173

### Client `tsconfig.json` — critical settings
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "ignoreDeprecations": "6.0",   ← intentional, do not remove
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Server Stack

| Concern | Library | Notes |
|---------|---------|-------|
| Framework | Express | v4 (v5 in root devDeps, irrelevant to server) |
| Language | TypeScript + tsx | tsx watch in dev |
| ORM | Drizzle ORM | v0.45 + drizzle-kit v0.31 |
| Database | PostgreSQL | pg v8 |
| Auth tokens | jsonwebtoken | httpOnly cookies, no localStorage |
| Passwords | bcryptjs | 10 rounds |
| Email | Nodemailer | OTP delivery, alerts |
| Cron | node-cron | Backup jobs |
| PDF gen | Puppeteer | Sprint 5 (not yet used) |
| Excel gen | ExcelJS | Sprint 5 (not yet used) |

**Dev port**: 3001

### Server environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | — | Access token signing |
| `JWT_REFRESH_SECRET` | — | Refresh token signing |
| `PORT` | 3001 | HTTP port |
| `NODE_ENV` | development | production enables secure cookies |
| `CORS_ORIGIN` | http://localhost:5173 | Must be exact (no wildcard with credentials) |
| `SMTP_HOST/PORT/USER/PASS` | — | Nodemailer for OTP emails |
| `UPLOAD_DIR` | /sicot/documents | Document storage path |
| `MAX_LOGIN_ATTEMPTS` | 5 | Lockout threshold |

## Data Flow

```
Browser (React SPA)
  │
  ├── Static assets ← Vite dev server :5173
  └── /api/* requests ─────────────────────► Express :3001
                                              │
                                              ├── middleware: helmet, cors, rate-limit
                                              ├── middleware: cookieParser → authenticate()
                                              ├── modules: auth / users / audit / (future)
                                              └── Drizzle ORM → PostgreSQL
```

## Auth Flow

```
1. Admin creates user → OTP generated → sent by email (Nodemailer)
2. User: matricule + OTP → POST /api/auth/login
3. Server: validates OTP → returns temp access token (role: 'premier_login', 5min)
4. Client: redirects to set-password step (etape: 'set-password')
5. User sets password → POST /api/auth/set-password
6. Server: hashes pw, flips premiere_connexion=false, issues full tokens in httpOnly cookies
   - sicot_access (15min)
   - sicot_refresh (7d)
7. Subsequent logins: matricule + password → POST /api/auth/login → tokens in cookies
8. Client Axios interceptor: on 401 → POST /api/auth/refresh → retry original request
9. On refresh failure: clear cookies → redirect /login
```

## Module Structure Pattern (Server)

Every future module follows:
```
packages/server/src/modules/<name>/
  controllers/<name>.controller.ts   — HTTP layer, input validation, calls service
  services/<name>.service.ts         — Business logic, DB queries via Drizzle
  routes/<name>.route.ts             — Express Router, auth/role middleware applied here
```
Then mounted in `src/index.ts` as `app.use('/api/<name>', ...routes)`.

## Backup Jobs

File: `packages/server/src/jobs/backup.ts`
- **Daily** `'0 2 * * *'` → local disk, retain 30 days
- **Weekly** `'0 3 * * 0'` → NAS target, retain 12 months
- Started at server boot in `index.ts`

## Pending Server Modules (all schema exists, no routes yet)

`/api/documents` `/api/organisations` `/api/accords` `/api/courriers`
`/api/missions` `/api/traductions` `/api/demandes` `/api/glossaire` `/api/dashboard`
