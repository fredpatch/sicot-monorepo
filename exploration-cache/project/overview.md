# 🏛️ SICOT – Project Overview

## What is SICOT?

**Système Intégré de Coopération Internationale et de Traduction**
Internal web application for **ANAC Gabon** (Agence Nationale de l'Aviation Civile), replacing the manual Excel-based workflows of the CCIT (Cellule de Coopération Internationale et de Traduction).

- **Deployment**: LAN-only, Windows server `SERV-APPI`
- **Languages**: French (default UI) + English toggle (react-i18next)
- **Users**: ~10-20 ANAC agents, role-based access

## 👥 Stakeholders

| Name | Role |
|------|------|
| Mme NGO MYTOULOU | Project owner, acceptance sign-off |
| M. NDONG N'NANG | Trainer, manual author |
| R. SOUNGOU | CCIT user (UAT) |
| D-L. NTSAME | CCIT user (UAT) |

## 📦 10 Functional Modules

| # | Module | Description |
|---|--------|-------------|
| M1 | Accords & Partenariats | International agreements, versioning, renewal alerts (ACC-2026-XXXX) |
| M2 | Partenaires Internationaux | Organizations + contacts directory, 3 org types |
| M3 | Missions & Événements | Mission planning, participants, reports, recommendations |
| M4 | Correspondances | Inbound/outbound courier (CORR-2026-XXXX), reply threads |
| M5 | Demandes de Traduction | Translation request inbox, priority system, auto-assign |
| M6 | Traduction IA | FR↔EN side-by-side editor, LibreTranslate + DeepL fallback |
| M7 | Glossaire | Aviation terminology FR↔EN, domain, history, CSV import |
| M8 | Gestion Documentaire | Upload PDF/Word/img, OCR (Tesseract), MD5 dedup, versioning |
| M9 | Dashboard & Statistiques | KPI blocks, monthly auto-report (PDF+Excel), exports |
| M10 | Administration & Auth | Users, roles, audit trail, OTP bootstrap, DB backup |

## 🚦 Current Status (June 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Sprint 0 — Init | ✅ Done | Stack, monorepo, DB schema, environment |
| Sprint 1 — M10 Auth & Admin | ✅ Done | Full auth, users, audit, backup, login UI |
| Sprint 2 — M8 + M2 | ⏳ Next | Documents, Partenaires |
| Sprint 3 — M1 + M4 + M3 | ⏳ Pending | Accords, Courriers, Missions |
| Sprint 4 — M6 + M7 + M5 | ⏳ Pending | Translation stack |
| Sprint 5 — M9 Dashboard | ⏳ Pending | |
| Sprint 6 — Tests & Recette | ⏳ Pending | |
| Sprint 7 — Déploiement + Formation | ⏳ Pending | |

## 📁 Repository

- **Repo**: `fredpatch/sicot-monorepo` (GitHub)
- **Branch**: `main`
- **Last commit**: `d51eee7` — feat(client): login page redesign with shadcn components & framer-motion

## 🔗 Related Files

- `project/architecture.md` — stack, auth flow, env vars
- `project/database-schema.md` — all tables + relations
- `project/decisions.md` — why things are the way they are
- `tasks/backlog.md` — all pending work
