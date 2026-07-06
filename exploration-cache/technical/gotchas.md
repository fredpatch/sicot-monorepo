# ⚠️ SICOT - Known Gotchas

## G1 — framer-motion: transition prop, NOT inside Variants

**Symptom**: `Type 'string' is not assignable to type 'Easing'` or similar TS error in `animations.ts`.
**Cause**: framer-motion v12 `Variants` type is strict — `transition` objects inside variant definitions are rejected.
**Fix**:
```tsx
// ❌ Will not compile
const bad: Variants = { enter: { x: 0, transition: { ease: 'easeOut' } } }

// ✅ Correct — pass transition as a separate prop
import type { Transition } from 'framer-motion';
const slideTx: Transition = { duration: 0.26, ease: 'easeOut' };
<motion.div variants={slideVariants} transition={slideTx} />
```

---

## G2 — Tailwind v4: no `tailwind.config.js`

**Symptom**: Custom color classes don't work, or someone creates a `tailwind.config.js`.
**Cause**: Tailwind v4 uses CSS-first configuration. The config file is not used.
**Fix**: All custom tokens live in `packages/client/src/index.css` under `@theme { }`.
```css
@theme {
  --color-anac-navy: #1B2A5E;
}
/* Then use: bg-anac-navy, text-anac-navy, border-anac-navy, etc. */
```
**Never** run `npx tailwindcss init` — it generates a v3 config.

---

## G3 — shadcn CLI breaks Tailwind v4

**Symptom**: After running `npx shadcn-ui add <component>`, `index.css` is corrupted or classes stop working.
**Cause**: shadcn CLI injects Tailwind v3 CSS and config syntax, incompatible with v4.
**Fix**: Never run shadcn CLI. Write components manually following the CVA pattern in `technical/patterns.md`.

---

## G4 — CORS + credentials requires explicit origin (no wildcard)

**Symptom**: Browser console shows `CORS policy: No 'Access-Control-Allow-Origin' header`.
**Cause**: `credentials: true` in CORS config is incompatible with `origin: '*'`. Browser blocks it.
**Fix** (`server/src/index.ts`):
```typescript
cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', // exact URL, no trailing slash
  credentials: true,
})
```
Also: Axios must use `withCredentials: true` on every request (set on the instance in `lib/axios.ts`).

---

## G5 — discriminatedUnion errors need type casting

**Symptom**: `Property 'otp' does not exist on type 'FieldErrors<LoginFormData>'`
**Cause**: When `loginSchema` is a `z.discriminatedUnion`, TypeScript cannot narrow `formState.errors` to a specific union member automatically.
**Fix**:
```typescript
// Instead of errors.otp?.message (TS error):
(errors as { otp?: { message?: string } }).otp?.message
```
Or check membership: `'otp' in errors ? (errors as ...).otp?.message : undefined`

---

## G6 — `ignoreDeprecations` is only valid in `packages/client/tsconfig.json`

**Symptom**: `error TS5103: Option 'ignoreDeprecations' can only be used when TypeScript version is...`
**Cause**: `"ignoreDeprecations": "6.0"` triggers TS5103 in the root `tsconfig.base.json` with the installed TypeScript version.
**Fix**: Remove it from `tsconfig.base.json`. Only `packages/client/tsconfig.json` should have it.
**Do not remove it from client tsconfig** — it's intentional.

**2026-07-05 update**: this now also fails *in* `packages/client/tsconfig.json`
itself, breaking `tsc --noEmit` client-wide. `package.json` declares
`typescript: ^5.4.5` but the actually-installed version is `5.9.3`, which
rejects `"ignoreDeprecations": "6.0"` outright (`TS5103`). Confirmed via
`git stash` this is pre-existing drift, not caused by any specific commit.
**Not yet fixed** — until it is, use `eslint` as the verification substitute
for TypeScript errors in the client package.

---

## G7 — multer file size and MIME filtering

**When implementing file upload (Sprint 2)**:
- Default multer has no size limit — always set `limits: { fileSize: 50 * 1024 * 1024 }` (50MB)
- Filter by MIME type in `fileFilter` callback (reject non-PDF/Word/image files)
- `upload.single('file')` field name must match the FormData key sent by the client

---

## G8 — Drizzle `where` with conditional filters

**Symptom**: `where(undefined)` throws or returns wrong results.
**Cause**: Passing `undefined` to `where()` in Drizzle can cause issues with some query builders.
**Fix**: Use `and()` with conditional conditions:
```typescript
import { and, eq } from 'drizzle-orm';

const conditions = [];
if (filters.categorie) conditions.push(eq(documents.categorie, filters.categorie));
if (filters.userId) conditions.push(eq(documents.uploadePar, filters.userId));

db.select().from(documents).where(and(...conditions));
```

---

## G9 — PostgreSQL enum values are validated at DB level

**Symptom**: `invalid input value for enum ...` error from PostgreSQL.
**Cause**: Drizzle enums map to PostgreSQL native enums. Values must be exact string matches.
**Fix**: Always use the TypeScript enum values from schema (e.g., `'en_attente'` not `'EN_ATTENTE'`). In migrations, adding new enum values requires a migration — Drizzle handles this with `drizzle-kit generate`.

---

## G10 — `premier_login` role in temp token

**Symptom**: A user with a temp token (first login, before set-password) could potentially access protected routes if role check is `requireAdmin`.
**Cause**: The temp token has `role: 'premier_login'` — it's not in `user_role` enum, it's a special string.
**Existing protection**: `authenticate` middleware sets `req.user.role = 'premier_login'`. `requireRole()` will reject it since it's not in any allowed role list.
**Do not** accidentally allow `premier_login` role in any route that shouldn't be accessible during first login.

---

## G11 — Radix Select rejects empty string as value

**Symptom**: `<SelectItem value="">` causes Radix to throw or silently break — the "all" filter option doesn't work.
**Cause**: `@radix-ui/react-select` requires non-empty string values for all `SelectItem` elements.
**Fix**: Use a sentinel value instead of empty string:
```tsx
// ❌ Breaks with Radix
<SelectItem value="">Tous</SelectItem>

// ✅ Use a sentinel
const TOUS = '__all__';
<SelectItem value={TOUS}>Tous</SelectItem>

// Then in filter logic:
const filtered = items.filter(i =>
  statutFiltre === TOUS || i.statut === statutFiltre
);
```

---

## G12 — react-hook-form doesn't reset when editing a different entity in the same modal

**Symptom**: Opening the edit modal for entity A, closing it, then opening for entity B still shows A's values.
**Cause**: `useForm` initializes once on mount. The modal component is not unmounted between opens if the parent keeps the same component instance in the tree.
**Fix**: Add `key={entity?.id ?? 'new'}` to the form sub-component. React will unmount + remount it (and therefore re-run `useForm`) whenever the key changes.
```tsx
// ✅ Forces RHF re-initialization when editing a different org
<FormulaireOrganisation
  key={orgSelectionnee?.id ?? 'new'}
  org={orgSelectionnee}
  onSubmit={handleSubmit}
/>
```
