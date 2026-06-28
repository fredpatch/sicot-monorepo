# 📝 SICOT – Changelog

## [Unreleased]

- exploration-cache initialized (knowledge base, session tracking, documentation)

---

## [d51eee7] — 2026-06-27 — feat(client): login page redesign with shadcn components & framer-motion

### Added
- `packages/client/src/lib/axios.ts` — Axios instance + 401 interceptor with refresh queue
- `packages/client/src/lib/auth.api.ts` — auth domain API functions
- `packages/client/src/lib/users.api.ts` — users domain API functions
- `packages/client/src/lib/audit.api.ts` — audit domain API functions
- `packages/client/src/lib/utils.ts` — `cn()` helper (clsx wrapper)
- `packages/client/src/components/ui/button.tsx` — CVA Button (5 variants, 4 sizes)
- `packages/client/src/components/ui/input.tsx` — forwardRef Input
- `packages/client/src/components/ui/label.tsx` — forwardRef Label
- `packages/client/src/pages/login/schemas.ts` — Zod discriminatedUnion login schema
- `packages/client/src/pages/login/animations.ts` — framer-motion Variants + Transition constants
- `packages/client/src/pages/login/components/FormField.tsx`
- `packages/client/src/pages/login/components/PasswordStrength.tsx`
- `packages/client/src/pages/login/components/EyeToggle.tsx`
- `packages/client/src/pages/login/components/ServerError.tsx`
- `packages/client/src/pages/login/components/StepTab.tsx`
- `packages/client/src/pages/login/components/ModeTab.tsx`
- `packages/client/src/pages/login/components/GridPattern.tsx`
- `packages/client/src/pages/login/components/index.ts`

### Changed
- `packages/client/src/lib/api.ts` — converted to barrel re-export
- `packages/client/src/pages/LoginPage.tsx` — full redesign with 2-step animated flow
- `packages/client/vite.config.ts` — added `@/` path alias
- `packages/client/tsconfig.json` — added `baseUrl`, `paths`, `ignoreDeprecations`

---

## [48e85d1] — 2026-06-26 — feat(audit): audit and backup implementation

### Added
- `packages/server/src/modules/audit/` — service, controller, routes (read-only audit log)
- `packages/server/src/jobs/backup.ts` — daily + weekly backup cron with retention

---

## [8eb2eed] — 2026-06-26 — fix(drizzle-orm): fix version conflict

### Fixed
- Resolved drizzle-orm version conflict between root and server package

---

## [c8d14f8] — 2026-06-26 — feat(users): users implementation

### Added
- `packages/server/src/modules/users/` — service, controller, routes (full CRUD + activation + OTP reset)

---

## [0049250] — 2026-06-26 — feat(tasks): update task list

### Changed
- `docs/TASKS.md` — updated task statuses and Sprint 1 progress

---

## [f5a382a] — 2026-06-25 — feat(auth): auth & admin implementation

### Added
- `packages/server/src/utils/jwt.ts` — token signing/verification
- `packages/server/src/utils/otp.ts` — OTP generation, hashing, verification
- `packages/server/src/utils/email.ts` — Nodemailer email utilities
- `packages/server/src/utils/error.ts` — AppError class
- `packages/server/src/middleware/auth.ts` — authenticate middleware, cookie options
- `packages/server/src/middleware/requiredRole.ts` — role hierarchy middleware
- `packages/server/src/modules/auth/` — service, controller, routes
- `packages/server/src/db/schema.ts` — complete DB schema (all 10 modules)
- `packages/client/src/App.tsx` — AuthContext, ProtectedRoute, AdminRoute
- `packages/client/src/components/layouts/Layout.tsx` — sidebar + header
- `packages/client/src/i18n/` — i18next FR/EN configuration
- `packages/client/src/index.css` — Tailwind v4 @theme ANAC tokens

---

## Sprint History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-06-27 | d51eee7 | Login page redesign + client lib split |
| 2026-06-26 | 48e85d1 | Audit + backup |
| 2026-06-26 | 8eb2eed | Drizzle version fix |
| 2026-06-26 | c8d14f8 | Users module |
| 2026-06-26 | 0049250 | Task list update |
| 2026-06-25 | f5a382a | Auth + full stack foundation |
