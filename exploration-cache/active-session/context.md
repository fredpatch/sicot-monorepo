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
last commit: 9249c49 feat(client): UI/UX hardening — shadcn Dialog/Select, RHF modals, Lucide icons
status: clean working tree
```

## Files Modified in Last Session (2026-06-28)

### UI/UX Hardening (commit 9249c49)
```
packages/client/src/components/layouts/Layout.tsx         (Lucide icons, motion sidebar, shadcn buttons)
packages/client/src/components/ui/dialog.tsx              (NEW — Radix-backed shadcn Dialog)
packages/client/src/components/ui/select.tsx              (NEW — Radix-backed shadcn Select)
packages/client/src/i18n/index.ts                         (bootstrap.* + common.required keys)
packages/client/src/pages/BootstrapPage.tsx               (NEW — full redesign, RHF + zod)
packages/client/src/pages/DocumentsPage.tsx               (NEW — shadcn Dialog/Select, RHF modal)
packages/client/src/pages/PartenairesPage.tsx             (NEW — shadcn Dialog/RHF forms)
packages/client/src/pages/login/components/FormField.tsx  (required badge prop)
packages/client/src/pages/LoginPage.tsx                   (minor refinements)
packages/client/src/lib/documents.api.ts                  (NEW — client API module)
packages/client/src/lib/organisations.api.ts              (NEW — client API module)
packages/client/src/App.tsx                               (DocumentsPage + PartenairesPage routes wired)
packages/client/package.json                              (@radix-ui packages added)
```

### Server Additions (same commit)
```
packages/server/src/modules/partenaires/controllers/organisations.controller.ts  (NEW)
packages/server/src/modules/partenaires/services/organisations.service.ts        (NEW)
packages/server/src/modules/partenaires/routes/organisations.route.ts            (NEW)
packages/server/src/start/controllers/bootstrap.controller.ts                    (NEW)
packages/server/src/start/services/bootstrap.service.ts                          (NEW)
packages/server/src/start/routes/bootstrap.route.ts                              (NEW)
packages/server/src/index.ts                                                      (new routes mounted)
```

### Earlier in the same day (commits 43a858d, 5d193f5, 14dd4da)
```
packages/ocr-service/main.py + requirements.txt
packages/server/src/utils/ocr.ts + hash.ts
packages/server/src/middleware/upload.ts
packages/server/src/modules/document/  (full module — 6 files)
packages/server/tsconfig.json + all 15 cross-module imports (@/ migrated)
```

## Critical Rules (Memorize These)

1. **framer-motion**: `transition` goes on the `motion.div` prop, NOT inside `Variants` objects
2. **Tailwind tokens**: `bg-anac-navy`, `text-anac-muted`, etc. — all prefixed `anac-`
3. **Cookie auth**: Axios needs `withCredentials: true`, CORS needs exact `origin` (no wildcard)
4. **`ignoreDeprecations: "6.0"`** in `packages/client/tsconfig.json` — leave it alone
5. **DB runs locally**: PostgreSQL on Windows, connection via `DATABASE_URL` in `.env`
6. **Radix Select sentinel**: Use `__all__` as the value for "all items" option — Radix Select rejects empty string `''`
7. **RHF reset on modal reopen**: Add `key={entity?.id ?? 'new'}` to the form component — forces RHF to re-initialize when editing a different item

## shadcn Components Available (`packages/client/src/components/ui/`)

| Component | Radix dep | Notes |
|-----------|-----------|-------|
| `button.tsx` | none | CVA: default/secondary/ghost/destructive/link; sizes: default/sm/lg/icon |
| `input.tsx` | none | `h-10`, focus ring `anac-sky` |
| `label.tsx` | none | `text-xs font-medium text-anac-text` |
| `dialog.tsx` | `@radix-ui/react-dialog` | Header / Body / Footer / Title / Description sub-parts |
| `select.tsx` | `@radix-ui/react-select` | Matches Input height; use `Controller` from RHF for controlled fields |

## OCR Service

`packages/ocr-service/main.py` — Python/Flask, port 5001. **Must be started separately.**
```
cd packages/ocr-service
.venv\Scripts\activate      # Windows
python main.py
```
The Express server checks OCR health at startup and warns if unavailable — it does NOT crash.
TypeScript client: `utils/ocr.ts` — `extraireTexte()` + `verifierServiceOCR()`.

## Environment Assumptions

- Node.js available in PATH
- PostgreSQL running locally on default port 5432
- Python 3 + venv in `packages/ocr-service/.venv`
- Tesseract 5.x installed at `C:\Users\Prime Daily\AppData\Local\Programs\Tesseract-OCR\tesseract.exe`
- LibreOffice installed at `C:\Program Files\LibreOffice\program\soffice.exe`
- `npm run dev` starts both server (3001) and client (5173) via `concurrently`
- OCR service started separately (`python main.py` in `packages/ocr-service/`)
- No Docker in use currently

## How to Re-orient After a Break

1. Read `exploration-cache/active-session/current-task.md` — where we are
2. Read `exploration-cache/active-session/next-actions.md` — what to do first
3. Check `exploration-cache/active-session/blockers.md` — anything in the way
4. Run `git log --oneline -5` to see recent commits
5. Run `git status` to check for any uncommitted work
