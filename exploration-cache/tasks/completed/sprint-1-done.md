# ✅ Sprint 1 — Completed Tasks & Lessons Learned

**Completed**: June 2026
**Commit**: `d51eee7` (and several preceding commits)

## What Was Built

### Auth System (server)
- `signAccessToken` (15min) + `signRefreshToken` (7d) via jsonwebtoken
- httpOnly cookies (`sicot_access`, `sicot_refresh`) — `sameSite: strict`, `secure` in prod
- `authenticate` middleware reads cookie, validates JWT, sets `req.user`
- Role hierarchy: `agent < traducteur < relecteur < admin < super_admin`
- `requireRole()`, `requireAdmin()`, `requireSuperAdmin()` middleware factories

### Auth Business Logic
- **First login flow**: OTP (bcrypt-hashed in DB) → temp token (role: `premier_login`, 5min) → client redirects to set-password
- **Normal login**: bcrypt password comparison → full tokens issued
- **Account lockout**: 5 failed attempts → 30-minute block via `bloque_jusqu_a` timestamp
- **OTP expiry**: 15 minutes from generation
- **Audit trail**: every auth event logged (`CONNEXION`, `OTP_VALIDE`, `MOT_DE_PASSE_DEFINI`)

### Login Page (client)
- 2-step animated flow (Connexion → Mot de passe) with framer-motion directional slides
- OTP / Password mode switcher within step 1
- Password strength meter (4 bars + criteria checklist)
- Eye toggle on password fields
- Server error banner with `role="alert"` / `aria-live="polite"`
- Zod `discriminatedUnion` for validation (otp mode vs password mode)
- All fields use `useId()` for accessible label association
- Lean orchestrator + private sub-views `LoginStep` / `SetPasswordStep` (kept inline)

### Infrastructure
- Backup cron: daily 02:00 (local), weekly Sunday 03:00 (NAS), retention 30d/12mo
- Rate limiting: global 100/15min, auth 10/15min
- Health endpoint: `GET /api/health`

## Lessons Learned

### 🔴 framer-motion TypeScript strictness
**Problem**: TypeScript rejected `ease: 'easeOut'` inside `Variants` objects. Even named easing strings triggered type errors because the `Variant` type is very strict about what properties are allowed.
**Solution**: Never put `transition` inside variant definitions. Always pass via `transition={slideTx}` prop on the `motion.div`.
**Time lost**: ~45 minutes debugging type errors.

### 🔴 Tailwind v4 + shadcn CLI incompatibility
**Problem**: `npx shadcn-ui add button` rewrites CSS expecting v3 config. Corrupts `index.css`.
**Solution**: Manual component creation. Spent time writing CVA-based `button.tsx` from scratch.
**Upside**: Full control over ANAC design tokens integration.

### 🟡 discriminatedUnion error access in react-hook-form
**Problem**: `loginSchema` is a `z.discriminatedUnion`. TypeScript can't narrow `formState.errors` to the correct union variant. Accessing `errors.otp` at compile time fails.
**Solution**: Type cast: `(errors as { otp?: { message?: string } }).otp?.message`

### 🟡 `tsconfig.base.json ignoreDeprecations` caused TS5103
**Problem**: `"ignoreDeprecations": "6.0"` in root `tsconfig.base.json` causes `error TS5103: Invalid value`.
**Solution**: Remove from base, keep only in `packages/client/tsconfig.json` where TypeScript handles it correctly.

### 🟢 Axios refresh queue works well
Concurrent 401s are reliably queued and replayed after a single refresh call. No race conditions observed in testing.

### 🟢 `discriminatedUnion` for form schema is the right call
Correctly separates OTP mode (6-digit numeric, no password required) from password mode (password required, OTP optional). Keeps validation clean per mode.
