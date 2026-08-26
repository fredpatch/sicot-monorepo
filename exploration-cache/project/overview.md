# 🏛️ SICOT - Project Overview

## What is SICOT?

**Système Intégré de Coopération Internationale et de Traduction**
Internal web application for **ANAC Gabon** (Agence Nationale de l'Aviation Civile), replacing the manual Excel-based workflows of the CCIT (Cellule de Coopération Internationale et de Traduction).

- **Deployment**: the original LAN-only plan on Windows server `SERV-APPI`
  is SCRATCHED (security issue on that server, per project owner
  2026-08-24) — no longer an option. Docker Compose/GitHub Actions/VPS
  infra (added 2026-08-24, see `project/architecture.md` § Deployment
  Infrastructure and `docs/deployment/production-guide.md`) is the only
  path now; the app already runs on a separate Ubuntu test server.
- **Languages**: French (default UI) + English toggle (react-i18next)
- **Users**: ~10-20 ANAC agents, role-based access

## 👥 Stakeholders

| Name             | Role                               |
| ---------------- | ---------------------------------- |
| Mme NGO MYTOULOU | Project owner, acceptance sign-off |
| M. NDONG N'NANG  | Trainer, manual author             |
| R. SOUNGOU       | CCIT user (UAT)                    |
| D-L. NTSAME      | CCIT user (UAT)                    |

## 📦 10 Functional Modules

| #   | Module                     | Description                                                          |
| --- | -------------------------- | -------------------------------------------------------------------- |
| M1  | Accords & Partenariats     | International agreements, versioning, renewal alerts (ACC-2026-XXXX) |
| M2  | Partenaires Internationaux | Organizations + contacts directory, 3 org types                      |
| M3  | Missions & Événements      | Mission planning, participants, reports, recommendations             |
| M4  | Correspondances            | Inbound/outbound courier (CORR-2026-XXXX), reply threads             |
| M5  | Demandes de Traduction     | Translation request inbox, priority system, auto-assign              |
| M6  | Traduction IA              | FR↔EN side-by-side editor, LibreTranslate + DeepL fallback           |
| M7  | Glossaire                  | Aviation terminology FR↔EN, domain, history, CSV import              |
| M8  | Gestion Documentaire       | Upload PDF/Word/img, OCR (Tesseract), MD5 dedup, versioning          |
| M9  | Dashboard & Statistiques   | KPI blocks, monthly auto-report (PDF+Excel), exports                 |
| M10 | Administration & Auth      | Users, roles, audit trail, OTP bootstrap, DB backup                  |

## 🚦 Current Status (updated 2026-08-24 — was stale since Sprint 1, see quick-ref.md/manifest.json for the maintained version of this table)

| Phase                                | Status        | Notes                                                                    |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| Sprint 0 — Init                      | ✅ Done       | Stack, monorepo, DB schema, environment                                  |
| Sprint 1 — M10 Auth & Admin          | ✅ Done       | Full auth, users, audit, backup, login UI, Personnel ANAC API (6e20415)  |
| Sprint 2 — M8 + M2                   | ✅ Done       | Documents (OCR), Partenaires                                             |
| Sprint 3 — M1 + M4 + M3              | ✅ Done       | Accords, Courriers, Missions                                             |
| Sprint 4 — M6 + M7 + M5              | ✅ Done       | Traduction IA, Glossaire, Demandes                                       |
| Sprint 5 — M9 Dashboard              | ✅ Done       | KPI, rapports auto, exports                                              |
| Sprint 8 — Notifications & Rappels   | ✅ Done       | Paramètres, notifications, relances, criticité courriers                 |
| Sprint 9 — Portail Documentaire      | ✅ Done       | /portail public, téléchargement tokénisé                                 |
| Sprint 10 — Paramètres Système       | ✅ Done       | OTP, blocage compte, rétention, journal d'audit UI+export                |
| Sprint 11 — Analytics & Rapports M11 | ✅ Done       | 27 métriques, export CSV/Excel, rapports PDF/Excel + cron mensuel        |
| Sprint 12 — Missions M3 + Courriers M4 + Traductions M6 + Glossaire M7 + Demandes M5 redesigns + deployment infra + PDF export + Agent workspace | ✅ Done (2026-08-24 → 2026-08-26) | Registry/creation/detail workspace ×4, logistics checklist migration, contact-level linking + multi-document attachment (migration 0013), Docker/CI-CD + `services:up` scripts, individual PDF export w/ preview, app-wide `useConfirm()`/data-router migration, glossary-suggestion + OCR-prefill bugfixes, manual-translation retry, Glossaire concept-first registry + multilingual-ready variants adapter + reactivate endpoint, Demandes registry rebuild + search + centralized permissions, new agent-only landing (`/mon-espace` + `/mes-missions`, closes a `/dashboard` route-guard gap), `/profil` page, self-service password change + server-side complexity enforcement everywhere, `users.poste/service/direction` (migration 0014) |
| Sprint 6 — Tests & Recette           | ⏳ Pending    | Deferred after Sprint 8/9/10                                             |
| Sprint 7 — Déploiement + Formation   | 🟡 Partial    | Docker/VPS path ready; SERV-APPI install + formations still pending      |

## 📁 Repository

- **Repo**: `fredpatch/sicot-monorepo` (GitHub)
- **Branch**: `main`
- **Last commit**: see `exploration-cache/manifest.json`'s `lastCommit` field for the maintained pointer (this line goes stale fast — don't trust it, `git log` is authoritative)

## 🔗 Related Files

- `project/architecture.md` — stack, auth flow, env vars
- `project/database-schema.md` — all tables + relations
- `project/decisions.md` — why things are the way they are
- `tasks/backlog.md` — all pending work
