# 🔴 Active Blockers

Last updated: 2026-06-28

## 🔴 Hard Blockers (Cannot proceed without)

### B1 — API Personnel ANAC not received
**Impact**: Cannot implement bootstrap admin flow (admin creates users by pulling from ANAC staff directory). Sprint 1 was partially completed manually.
**Current workaround**: Users are created manually in the DB via admin UI or directly.
**Waiting on**: ANAC IT dept to provide API documentation.
**Affects**: Sprint 1 partial task + user creation flow.

---

## 🟡 Soft Blockers (Work around them for now)

### B2 — SERV-APPI access not confirmed
**Impact**: Cannot test production deployment. PostgreSQL, LibreTranslate, Tesseract must be installable on that server.
**Current workaround**: Develop locally, deploy later.
**Waiting on**: IT dept confirmation.

### B3 — Glossaire CCIT Excel file not received
**Impact**: Cannot seed M7 (glossaire) with existing ANAC terminology.
**Current workaround**: Build the import script + UI first, seed data when file arrives.
**Waiting on**: CCIT (R. SOUNGOU or D-L. NTSAME).

### B4 — DeepL decision pending
**Impact**: Cannot finalize translation engine fallback chain (LibreTranslate → DeepL).
**Current workaround**: Build LibreTranslate integration only. DeepL slot is already in `moteur_traduction` enum (`deepl` value).
**Waiting on**: DG approval + RGPD contract. DeepL is a cloud service (data leaves ANAC network).

---

## 🟢 Resolved Blockers (History)

| Blocker | Resolved | How |
|---------|----------|-----|
| Tailwind v4 + shadcn CLI incompatibility | 2026-06-27 | Manual component creation |
| framer-motion TypeScript strict mode on `ease` | 2026-06-27 | Moved transition to prop, extracted `slideTx` constant |
| `tsconfig.base.json ignoreDeprecations TS5103` | 2026-06-27 | Removed from base, kept only in client tsconfig |
