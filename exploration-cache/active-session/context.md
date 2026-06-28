# 🧠 Session Context

Last updated: 2026-06-28

## What a Fresh Session Needs to Know

You are working on **SICOT**, an internal ANAC Gabon web app. It is a TypeScript monorepo:
- `packages/client` — React 18 + Vite + **Tailwind v4** (no config file)
- `packages/server` — Express 4 + Drizzle ORM + PostgreSQL
- `packages/shared` — shared types (minimal)

**The `@/` alias** maps to `packages/client/src/`. Always use it for client imports.

**No shadcn CLI ever.** Tailwind v4 breaks it. Components are in `components/ui/` and are hand-written.

## Current Git State

```
branch: main
last commit: d51eee7 feat(client): login page redesign with shadcn components & framer-motion
status: clean working tree
```

## Files Modified in Last Session (2026-06-27)

```
packages/client/src/lib/api.ts              (barrel, replaced original)
packages/client/src/lib/axios.ts            (new — Axios instance + interceptor)
packages/client/src/lib/auth.api.ts         (new)
packages/client/src/lib/users.api.ts        (new)
packages/client/src/lib/audit.api.ts        (new)
packages/client/src/lib/utils.ts            (new — cn helper)
packages/client/src/components/ui/button.tsx (new — CVA)
packages/client/src/components/ui/input.tsx  (new)
packages/client/src/components/ui/label.tsx  (new)
packages/client/src/pages/LoginPage.tsx      (redesigned)
packages/client/src/pages/login/schemas.ts   (new)
packages/client/src/pages/login/animations.ts (new)
packages/client/src/pages/login/components/* (7 new files)
packages/client/vite.config.ts              (added @/ alias)
packages/client/tsconfig.json               (added baseUrl + paths)
```

## Critical Rules (Memorize These)

1. **framer-motion**: `transition` goes on the `motion.div` prop, NOT inside `Variants` objects
2. **Tailwind tokens**: `bg-anac-navy`, `text-anac-muted`, etc. — all prefixed `anac-`
3. **Cookie auth**: Axios needs `withCredentials: true`, CORS needs exact `origin` (no wildcard)
4. **`ignoreDeprecations: "6.0"`** in `packages/client/tsconfig.json` — leave it alone
5. **DB runs locally**: PostgreSQL on Windows, connection via `DATABASE_URL` in `.env`

## Environment Assumptions

- Node.js available in PATH
- PostgreSQL running locally on default port 5432
- `npm run dev` starts both server (3001) and client (5173) via `concurrently`
- No Docker in use currently

## How to Re-orient After a Break

1. Read `exploration-cache/active-session/current-task.md` — where we are
2. Read `exploration-cache/active-session/next-actions.md` — what to do first
3. Check `exploration-cache/active-session/blockers.md` — anything in the way
4. Run `git log --oneline -5` to see recent commits
5. Run `git status` to check for any uncommitted work
