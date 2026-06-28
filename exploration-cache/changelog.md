# 📝 SICOT – Changelog

## [9249c49] — 2026-06-28 — feat(client): UI/UX hardening — shadcn Dialog/Select, RHF modals, Lucide icons

### Added
- `packages/client/src/components/ui/dialog.tsx` — shadcn Dialog on `@radix-ui/react-dialog`; animated overlay + content; Header/Body/Footer/Title/Description sub-parts
- `packages/client/src/components/ui/select.tsx` — shadcn Select on `@radix-ui/react-select`; matches Input height/border; Check indicator
- `packages/client/src/pages/BootstrapPage.tsx` — full redesign matching LoginPage (RHF + zod, framer-motion, `useTranslation`, required badge, success screen)
- `packages/client/src/pages/DocumentsPage.tsx` — shadcn Select filters + Dialog+RHF OCR modal; Lucide icons throughout
- `packages/client/src/pages/PartenairesPage.tsx` — shadcn Dialog modals for org/contact forms; RHF + zod; shadcn Select/Input/Label
- `packages/client/src/lib/documents.api.ts` — client API module for documents
- `packages/client/src/lib/organisations.api.ts` — client API module for organisations
- `packages/server/src/modules/partenaires/` — organisations CRUD (service + controller + route)
- `packages/server/src/start/` — bootstrap routes (service + controller + route)

### Changed
- `packages/client/src/components/layouts/Layout.tsx` — Lucide nav icons, `motion.aside` sidebar collapse, shadcn Button logout/language, avatar initials `rounded-lg`
- `packages/client/src/pages/login/components/FormField.tsx` — `required?: boolean` prop shows red badge via `t('common.required')`
- `packages/client/src/i18n/index.ts` — added `bootstrap.*` namespace + `common.required` (FR + EN)
- `packages/client/src/App.tsx` — DocumentsPage + PartenairesPage routes wired
- `packages/client/package.json` — added `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-scroll-area`
- `packages/server/src/index.ts` — partenaires + bootstrap routes mounted

---

## [41d3cde] — 2026-06-28 — chore(cache): update manifest lastCommit to 14dd4da

### Changed
- `exploration-cache/manifest.json` — lastCommit pointer updated

---

## [14dd4da] — 2026-06-28 — feat(server): documents module + @/ path alias

### Added
- `packages/ocr-service/main.py` — Python/Flask OCR microservice, port 5001
- `packages/ocr-service/requirements.txt`
- `packages/server/src/utils/ocr.ts` — TypeScript HTTP client (`extraireTexte`, `verifierServiceOCR`)
- `packages/server/src/utils/hash.ts` — `calculerMD5(buffer)`
- `packages/server/src/middleware/upload.ts` — multer memoryStorage, 50MB, MIME filter, `handleMulterError`
- `packages/server/src/modules/document/services/documents.types.ts` — interfaces + `DocumentCategorie`
- `packages/server/src/modules/document/services/documents.constants.ts` — storage config + keyword classifier data
- `packages/server/src/modules/document/services/documents.helpers.ts` — pure utility functions
- `packages/server/src/modules/document/services/documents.service.ts` — service layer
- `packages/server/src/modules/document/controllers/documents.errors.ts` — `handleDocumentsError`
- `packages/server/src/modules/document/controllers/documents.controller.ts` — all route handlers
- `packages/server/src/modules/document/routes/documents.route.ts` — Express router, wired

### Changed
- `packages/server/src/index.ts` — OCR health check at startup, documents route mounted
- `packages/server/package.json` — added `axios`, `form-data`, `tsc-alias`; build: `tsc && tsc-alias`
- `packages/server/tsconfig.json` — added `baseUrl: "./src"`, `@/*` path alias
- 15 server source files — all `../../`/`../../../` imports migrated to `@/` alias
- `docs/TASKS.md` — marked OCR test ✅, LibreTranslate test ✅

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
| 2026-06-28 | 9249c49 | UI/UX hardening — Dialog/Select, RHF modals, partenaires + bootstrap modules |
| 2026-06-28 | 41d3cde | Cache manifest update |
| 2026-06-28 | 14dd4da | Documents server module + @/ path alias |
| 2026-06-28 | 5d193f5 | OCR microservice |
| 2026-06-28 | 43a858d | exploration-cache initialized |
| 2026-06-27 | d51eee7 | Login page redesign + client lib split |
| 2026-06-26 | 48e85d1 | Audit + backup |
| 2026-06-26 | 8eb2eed | Drizzle version fix |
| 2026-06-26 | c8d14f8 | Users module |
| 2026-06-26 | 0049250 | Task list update |
| 2026-06-25 | f5a382a | Auth + full stack foundation |
