# ⚖️ SICOT – Key Technical Decisions

A permanent log of non-obvious choices. "Why" is the critical part — without it, future sessions will undo decisions that had good reasons.

---

## 1. 🚫 No shadcn CLI — Manual UI Components

**Decision**: All shadcn-style components are manually crafted in `components/ui/`.
**Why**: `npx shadcn-ui add` has broken/experimental Tailwind v4 support. Running it corrupts the `index.css` configuration and injects v3 syntax.
**Scope**: `button.tsx`, `input.tsx`, `label.tsx` — any future shadcn component (Dialog, Select, Tabs, etc.) must also be written manually.
**Pattern to follow**:
1. Look up shadcn component source on shadcn.com
2. Adapt imports (remove `cn` from shadcn, use `@/lib/utils`)
3. Replace hardcoded colors with ANAC tokens
4. Test with `@/` alias

---

## 2. 🎨 Tailwind v4 Syntax — No `tailwind.config.js`

**Decision**: Using Tailwind v4 with `@import "tailwindcss"` and `@theme {}` block in `index.css`.
**Why**: Chosen at project init for forward compatibility. No config file exists and none should be created.
**Critical**: Custom tokens live in `index.css` `@theme` block as CSS variables (`--color-anac-navy: #1B2A5E`). They are NOT in any JS config. When adding new tokens, edit `index.css` only.

---

## 3. 🎬 framer-motion: Transitions Outside Variants

**Decision**: Pass `transition` as a prop on `motion.div`, never inside `Variants` objects.
**Why**: framer-motion v12 has strict TypeScript types. The `Variant` type rejects non-`Easing` values inside variant objects, even named strings like `'easeOut'`. This causes a TS compile error.
**Correct pattern**:
```tsx
// ✅ Correct — transition is a separate prop
<motion.div variants={slideVariants} transition={slideTx} />

// ❌ Wrong — TS error in variant definition
const variants = {
  enter: { x: 36, opacity: 0, transition: { ease: 'easeOut' } }
}
```
**Location of constants**: `packages/client/src/pages/login/animations.ts`

---

## 4. 📝 `ignoreDeprecations: "6.0"` in Client tsconfig

**Decision**: Kept in `packages/client/tsconfig.json`. Do NOT remove.
**Why**: Intentionally retained by the project owner for reasons beyond this session's scope.
**Note**: This flag was removed from root `tsconfig.base.json` because it caused `error TS5103` there. It only belongs in `packages/client/tsconfig.json`.

---

## 5. 🔐 httpOnly Cookies — No localStorage for Tokens

**Decision**: Access token in `sicot_access` cookie (15min), refresh in `sicot_refresh` (7d). Both httpOnly.
**Why**: XSS protection — JavaScript cannot read httpOnly cookies, so a compromised script cannot steal the token.
**Consequences**:
- Axios: `withCredentials: true` on all requests
- CORS: `credentials: true` + explicit `origin` (no `*` wildcard — browsers reject credentials with wildcard)
- Server cookie options: `sameSite: 'strict'`, `secure: true` in production

---

## 6. 🔄 Token Refresh Queue in Axios Interceptor

**Decision**: Concurrent 401s are queued; a single refresh call is made; all queued requests are replayed.
**Why**: Without queuing, 3 simultaneous expired-token requests each trigger `POST /refresh`, causing token rotation race conditions where 2 of 3 refreshes fail (or rotate the refresh token to an unexpected state).
**Location**: `packages/client/src/lib/axios.ts` — `isRefreshing` flag + `failedQueue` array pattern.

---

## 7. 📄 LoginStep + SetPasswordStep Kept Inline

**Decision**: The two step sub-views in `LoginPage.tsx` are private functions in the same file, not moved to `login/components/`.
**Why**: They share `loginForm`, `passwordForm`, `useId()` values, and 10+ state callbacks with the parent. Extracting would require either prop-drilling all of it or creating a Context just for one page — both worse than the inline approach.
**If the file gets too big**: Extract the *pure sub-components* (FormField, EyeToggle, etc.) but keep the step views inline.

---

## 8. 🔑 OTP — Bcrypt-Hashed in DB

**Decision**: OTP stored as bcrypt hash in `users.otp_hash`, not plaintext.
**Why**: If DB is leaked, OTP codes are not exposed. Standard practice for all secrets at rest.
**Expiry**: 15 minutes (`otp_expires_at` column). Cleared from DB on successful `set-password`.

---

## 9. 🚦 Account Lockout Strategy

**Decision**: 5 failed login attempts → account locked for 30 minutes.
**Config**: `MAX_LOGIN_ATTEMPTS` env var (default 5), `BLOCAGE_MINUTES = 30` (hardcoded, change in auth.service.ts if needed).
**Reset**: Automatic — `bloque_jusqu_a` is a timestamp, server checks `new Date() < bloqueJusquA` on each attempt. Successful login calls `resetTentatives()`.

---

## 10. 🛡️ Admin Activation Required

**Decision**: New users are created with `actif: false`. Admin must explicitly activate via `PATCH /api/users/:id/activation`.
**Why**: Prevents unauthorized access from partially-created accounts. Ensures admin reviews each account before it can log in.
**Consequence**: Even after setting a password, a deactivated user will get `COMPTE_INTROUVABLE` error (same error as user not found — no information leakage).
