# SICOT - Architecture Overview

Audience: developers and technical maintainers who need to understand SICOT
before changing it. This is not a user guide (see [`docs/user-guide/`](../user-guide/))
and not an operations manual (see [`docs/operations/`](../operations/)).

## System purpose

**SICOT** - _Système Intégré de Coopération Internationale et de Traduction_

- is ANAC Gabon's internal system for managing:

- international cooperation records: **accords** (agreements), **partenaires**
  (partner organisations/contacts), **courriers** (correspondence)
- **missions** and their official reports/recommendations
- **translation** requests and workflow, plus a shared **glossaire**
- a document library with OCR extraction and controlled **public portal**
  exposure
- **analytics/rapports**, including an optional AI-generated narrative
- administration: users, system parameters, audit log

## Monorepo structure

npm workspaces, defined in the root [`package.json`](../../package.json)
(`"workspaces": ["packages/*"]`):

| Package                                                          | Runtime                               | Responsibility                                                                                | Depends on                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`packages/client`](../../packages/client)                       | Vite + React + TypeScript (SPA)       | All authenticated UI, the Help Center, and the public portal pages                            | `@sicot/shared` (roles/capabilities)                                                                     |
| [`packages/server`](../../packages/server)                       | Node + Express + TypeScript           | The HTTP API: all domain modules, auth, jobs                                                  | `@sicot/shared`; calls out to `ocr-service`, `translate-service`, Postgres, SMTP, Gemini, Personnel ANAC |
| [`packages/shared`](../../packages/shared)                       | TypeScript (built with `tsc`)         | Single source of truth for the role/capability authorization model                            | none - imported by both client and server                                                                |
| [`packages/ocr-service`](../../packages/ocr-service)             | Python (Flask, served via `waitress`) | Standalone OCR microservice (Tesseract, `pdfplumber`, `pdf2image`, `python-docx`, `openpyxl`) | none - called over HTTP by the server                                                                    |
| [`packages/translate-service`](../../packages/translate-service) | Python (Flask, `waitress`)            | Wraps LibreTranslate, with an optional DeepL SaaS fallback                                    | LibreTranslate (own container); optionally DeepL                                                         |

`ocr-service` and `translate-service` are genuinely separate processes/containers,
not in-process Node modules - see [runtime-topology.md](./runtime-topology.md).

## Component architecture

Only components that actually exist in the repository today:

- **React/Vite SPA** (`packages/client`) - the only frontend; also serves the
  public portal routes (`/portal`, `/portal/telecharger/:token`).
- **Node/Express API** (`packages/server`) - the only backend; ~20 domain
  modules under `packages/server/src/modules/`.
- **PostgreSQL** - via Drizzle ORM, see [data-model.md](./data-model.md).
- **OCR microservice** (`packages/ocr-service`) - extracts text from uploaded
  documents; called synchronously over HTTP from
  [`packages/server/src/utils/ocr.ts`](../../packages/server/src/utils/ocr.ts).
- **Translation microservice** (`packages/translate-service`) - called from
  [`packages/server/src/utils/traduction.ts`](../../packages/server/src/utils/traduction.ts).
- **LibreTranslate** - self-hosted translation engine, called by
  `translate-service` (not directly by the Node API).
- **Optional DeepL fallback** - SaaS, called by `translate-service` only when
  `DEEPL_ENABLED` is set; SICOT's own server never talks to DeepL directly.
- **SMTP** - outbound transactional email (OTP activation, account
  confirmation, accord/recommendation deadline alerts, portal download
  links) via [`packages/server/src/utils/email.ts`](../../packages/server/src/utils/email.ts)
  (`nodemailer`).
- **Personnel ANAC API** - external HR/personnel directory reached over a
  Tailscale-private network, via
  [`packages/server/src/utils/personnel-anac.ts`](../../packages/server/src/utils/personnel-anac.ts).
- **Gemini (report narrative)** - Google's `@google/genai` SDK, called from
  [`packages/server/src/modules/analytics/services/gemini.service.ts`](../../packages/server/src/modules/analytics/services/gemini.service.ts)
  to draft the "analyse IA" narrative for reports. Explicitly gated in code
  comments as test-only pending DG/RGPD approval before production use.
- **Document storage** - local filesystem under `UPLOAD_DIR` (a Docker
  volume in every compose tier), not object storage. See
  [data-model.md](./data-model.md) for the metadata model.
- **Scheduled jobs** - in-process `node-cron`, started at server boot from
  [`packages/server/src/index.ts`](../../packages/server/src/index.ts): daily
  backup, daily accord-expiry alerts, daily correspondence-criticality
  snapshot, monthly report generation. A separate manual-trigger registry
  (`packages/server/src/jobs/registre.ts`) lets admins run jobs on demand.
- **Public portal** - unauthenticated document-discovery/download surface,
  implemented as routes inside the _same_ client SPA and _same_ server API
  (`packages/server/src/modules/portal/`), not a separate deployment.

## Request flow

```
Browser
  → React/Vite SPA (packages/client)
    → Express API (packages/server), under /api/*
      → domain service (packages/server/src/modules/<domain>/services/)
        → PostgreSQL (Drizzle)  and/or  local document storage
        → outbound HTTP calls: OCR service, translate-service, Personnel ANAC, Gemini
        → outbound SMTP
```

- The **public portal** shares this exact same SPA and API - its routes are
  simply unauthenticated within the same Express app
  (`packages/server/src/modules/portal/routes/portal.route.ts`), not a
  separate frontend or backend.
- Every external/microservice call (OCR, translation, Gemini, Personnel ANAC,
  SMTP) is **outbound only**, initiated by the Node API.
- **No inbound webhook/callback architecture exists.** Nothing calls back
  into the Express API from OCR, translate-service, or Gemini - those calls
  are synchronous request/response from the server's point of view.

## Server layering

Each domain module under `packages/server/src/modules/<name>/` follows the
same three-layer pattern:

```
routes/<name>.route.ts       - Express router, wires authenticate + requireCapability
  → controllers/<name>.controller.ts   - request/response shaping
    → services/<name>.service.ts       - business logic, Drizzle queries, outbound calls
```

There is **no globally-named "repository" layer** - services call Drizzle
directly (`import { db } from '@/db'`). Do not describe this codebase as
having a repository pattern; it doesn't.

One module, `report` (`packages/server/src/modules/report/`), currently has
an empty, unmounted route file (`routes/rapports.route.ts`) - its real
functionality lives in `modules/analytics` and `modules/report/services`
instead. Flagged here as a known inconsistency, not fixed in this phase.

## Authorization architecture

Full detail belongs in the future `docs/security/authorization.md`; this is
the short version needed to understand the codebase shape.

```
persistent role (users.role)
  → shared capability registry (packages/shared/src/auth/)
    → route/action authorization middleware (requireCapability(), per-route)
      → contextual domain policy (in the service layer, e.g. "only the
        request's own demandeur can recall it")
```

Persistent roles (`packages/shared/src/auth/roles.ts`):

```
agent | operateur | admin | super_admin
```

One role per user account, no numeric hierarchy - capability sets are
additive per tier (`ROLE_CAPABILITIES` in
`packages/shared/src/auth/role-capabilities.ts`) and decide what a role can
do, not the role name itself.

**Workflow actors are domain assignments, not persistent roles.** A
translation record's `traducteurId`/`relecteurId` (who is currently assigned
to translate/review _this specific record_) are ordinary foreign keys on
`traductions`/`demandesTraduction`, populated with any `operateur`-or-above
user's ID. They are unrelated to `UserRole` - there is no `traducteur` or
`relecteur` role in the codebase; those were merged into `operateur` and
removed from the role type entirely.

## Architectural boundaries

To avoid duplicated or conflicting documentation across the repo:

- **User-facing how-to content** lives under [`docs/user-guide/`](../user-guide/)
  (consumed live by the Help Center) - this document does not repeat it.
- **Technical architecture** (this file, plus `runtime-topology.md` and
  `data-model.md`) lives under `docs/architecture/`.
- **Deployment/operational procedures** (install, migrate, backup/restore,
  scheduled-job runbooks) will live under `docs/operations/` (not yet
  created - Phase 11.4).
- **Security design detail** (authentication, CSRF posture, audit logging,
  document access rules) will live under `docs/security/` (not yet created
  - Phase 11.2).

This document intentionally does not repeat deployment commands, migration
procedures, or user workflow instructions - those belong in the documents
above once written.
