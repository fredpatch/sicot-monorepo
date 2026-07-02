# 📝 SICOT – Changelog

## [7a1de70] — 2026-07-02 — feat(sprint8): Accords expirés dashboard block + HistoriqueNotifications component

### Added
- `packages/client/src/pages/HistoriqueNotifications.tsx` — reusable passive notification-history component, wired onto `AccordDetail`, `CourrierDetail`, and per-recommandation on `MissionDetail`
- Dashboard "Accords expirés — action requise" block — lists accords with `statut=expire`, sorted by days-since-expiration, links to `/accords/:id`
- `packages/server/src/modules/dasboard/services/dashboard.helpers.ts` — `getAccordsExpirant(maintenant)` (nonTraites count + top-5 list)
- `packages/server/src/modules/dasboard/services/dashboard.types.ts` — `DashboardData.accordsExpires`, `kpi.accordsActifs.expiresNonTraites`

### Changed
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — "Notifier tous" bulk-notify button (sequential send to every partner with an email, reports envoyés/ignorés), `HistoriqueNotifications` block
- `packages/client/src/pages/DashboardPage.tsx` — `accordsActifs` KPI card escalates its `sousLigne` message when `expiresNonTraites > 0`
- `packages/server/src/modules/dasboard/services/dashboard.service.ts` — wires `getAccordsExpirant` into `getDashboardData`
- `docs/TASKS.md` — Sprint 8 (Centre de Notifications & Rappels CCIT) marked ✅ COMPLÉTÉ with full file-by-file changelog; new Sprint 10 backlog item (seed parametres via Drizzle migration)

This is Sprint 8's closing commit — see `sessions/2026-07-02.md` for the full picture (this commit completed the sprint that `ccbd3f2`/`f9b14f8` had been building toward).

---

## [dd2809d] — 2026-07-02 — refactor(server): split module services into types/helpers, centralize error handlers

### Changed — all 13 server modules (mechanical split, no behavior change)
- `packages/server/src/modules/{parametres,audit,notifications,users,auth,glossaire,demandes,partenaires,traduction,accords,courriers,dasboard,missions}/services/*.service.ts` — split into `.types.ts` + `.helpers.ts` + slim `.service.ts`
- `packages/server/src/utils/error.ts` — `createErrorHandler` factory gained optional `prefixHandlers` for dynamic error codes; now hosts handlers for glossaire, parametres, organisations, courriers, traduction, demandes, accords, missions (in addition to pre-existing auth/users/audit)
- 8 controllers (`glossaire`, `parametres`, `organisations`, `courriers`, `traduction`, `demandes`, `accords`, `missions`) — inline `errorMap` closures removed, now import shared handlers from `utils/error.ts`

### De-duplicated
- `audit.service.ts` — row→view mapping (2x) → `toAuditLogView`
- `courriers.service.ts` — seuils reloaded 5x → `chargerSeuils()`
- `dashboard.service.ts` — monolithic ~350-line `getDashboardData` → 13 named per-section query functions in `dashboard.helpers.ts`; day-diff calc (3x) → `getDaysDiff`
- `missions.service.ts` — RecommandationView shaping (3x) → `toRecommandationView`

### Notes
- `auth.service.ts`'s `logAudit` intentionally left at its original export path — imported repo-wide
- `packages/server/src/utils/{email.ts,error.ts,traduction.ts}` also had a prior-session split (email templates → `email.templates.ts`, traduction types → `traduction.types.ts`) folded into this commit
- Verified with `tsc --noEmit` after every file — zero new type errors vs. clean-main baseline

---

## [ccbd3f2] — 2026-06-30 — feat(sprint5): Jobs module (REGISTRE_JOBS) + major page + service refinements

### Added — Jobs module (M10 admin)
- `packages/server/src/jobs/registre.ts` — REGISTRE_JOBS registry: accords_expiration, accords_alertes, courriers_criticite, recommandations_retard, backup_bdd (super_admin), backup_nas (super_admin)
- `packages/server/src/modules/jobs/services/jobs.service.ts`
- `packages/server/src/modules/jobs/controllers/jobs.controller.ts`
- `packages/server/src/modules/jobs/routes/jobs.route.ts`
- `packages/client/src/lib/jobs.api.ts` — lister, executer (60s timeout)

### Changed — server
- `packages/server/src/index.ts` — /api/jobs mounted
- `packages/server/src/jobs/alertes.ts` — mettreAJourAccordsExpires + envoyerAlertesAccords exported for manual trigger
- `packages/server/src/jobs/backup.ts` — declencherSauvegardeManuelle + effectuerSauvegarde + BACKUP_NAS_DIR exported
- `packages/server/src/db/schema.ts` — additions
- `packages/server/src/modules/accords/services/accords.service.ts` — refinements
- `packages/server/src/modules/courriers/services/courriers.service.ts` — major additions
- `packages/server/src/modules/missions/services/missions.service.ts` — major additions
- `packages/server/src/modules/missions/controllers/missions.controller.ts` — additions
- `packages/server/src/modules/dasboard/services/dashboard.service.ts` — major enhancements

### Changed — client
- `packages/client/src/lib/api.ts` — jobsApi barrel export
- `packages/client/src/lib/missions.api.ts` — minor update
- `packages/client/src/pages/AdminParametresPage.tsx` — Jobs panel added (trigger + live result)
- `packages/client/src/pages/DashboardPage.tsx` — major enhancements
- `packages/client/src/pages/AccordsPage.tsx` — enhancements
- `packages/client/src/pages/CourriersPage.tsx` — enhancements
- `packages/client/src/pages/PartenairesPage.tsx` — enhancements
- `packages/client/src/pages/missions/components/MissionDetails.tsx` — enhanced recommendations
- `packages/client/src/pages/missions/components/MissionFormPage.tsx` — enhancements
- `packages/client/src/pages/courriers/components/CourrierDetail.tsx` — refinements
- `docs/TASKS.md` — Sprint 5 progress updated

---

## [f9b14f8] — 2026-06-30 — feat(sprint5): Dashboard M9 + AdminParametresPage + Notifications + ModalRelance + refinements

### Added — Sprint 5 Client
- `packages/client/src/pages/DashboardPage.tsx` — 8 KPI blocs, 3 Chart.js charts (bar/doughnut/h-bar), alertes critiques panel, recommandations panel, activité récente feed
- `packages/client/src/lib/dashboard.api.ts` — GET /dashboard client
- `packages/client/src/pages/AdminParametresPage.tsx` — settings CRUD grouped by module, change history panel
- `packages/client/src/lib/parametres.api.ts` — lister, getByModule, mettreAJour, getHistorique
- `packages/client/src/lib/notifications.api.ts` — envoyer, historiqueEntite, recentes
- `packages/client/src/components/ModalRelance.tsx` — reusable relance email modal

### Added — Sprint 5 Server
- `packages/server/src/modules/dasboard/` — service + controller + route (note: typo in folder "dasboard")
- `packages/server/src/modules/parametres/` — service + controller + route
- `packages/server/src/modules/notifications/` — service + controller + route

### Changed
- `packages/client/src/App.tsx` — /dashboard → DashboardPage, /admin/* → AdminParametresPage
- `packages/client/src/lib/api.ts` — dashboardApi, parametresApi, notificationsApi barrel exports
- `packages/client/package.json` — chart.js ^4.5.1 added
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — enhanced detail view
- `packages/client/src/pages/courriers/components/CourrierDetail.tsx` — relance workflow with ModalRelance
- `packages/client/src/pages/missions/components/MissionDetails.tsx` — enhanced recommendations section
- `packages/server/src/index.ts` — /api/dashboard, /api/parametres, /api/notifications mounted
- `packages/server/src/db/schema.ts` — parametres + notifications tables added
- `packages/server/src/utils/email.ts` — sendRelanceEmail + sendNotificationEmail added
- `packages/server/src/jobs/alertes.ts` — notifications integration
- `packages/server/src/modules/accords/services/accords.service.ts` — dashboard aggregation queries
- `packages/server/src/modules/courriers/services/courriers.service.ts` — getSansReponse refinements
- `packages/server/src/modules/missions/services/missions.service.ts` — getRecommandationsEnAttente additions
- `docs/TASKS.md` — Sprint 5 progress updated

---

## [9e67bee] — 2026-06-29 — feat(sprint4): M5 Demandes server+client + TraductionsPage + TraductionEditeur + DemandesPage

### Added — Sprint 4 Client (Traductions + Demandes)
- `packages/client/src/pages/TraductionsPage.tsx` — list with statut/direction filters, lancer traduction dialog, moteur status badge
- `packages/client/src/pages/traductions/components/TraductionEditeur.tsx` — côte-à-côte éditeur (texteOriginal/texteIA/texteFinal), approve/archive workflow, suggestions glossaire panel
- `packages/client/src/pages/DemandesPage.tsx` — kanban inbox: Soumise→En cours→En relecture→Validée→Archivée, prendreEnCharge, priorité badge
- `packages/client/src/lib/demandes.api.ts` — lister, getById, creer, prendreEnCharge, rappeler, validerPriorite, soumettre, archiver

### Added — Sprint 4 Server (M5 Demandes)
- `packages/server/src/modules/demandes/services/demandes.service.ts` — CRUD + optimistic lock (prendreEnCharge/rappeler), priorité, statuts pipeline
- `packages/server/src/modules/demandes/controllers/demandes.controller.ts`
- `packages/server/src/modules/demandes/routes/demandes.route.ts`

### Changed
- `packages/client/src/App.tsx` — /traductions + /traductions/:id + /demandes routes wired (ComingSoon replaced)
- `packages/client/src/lib/api.ts` — demandesApi added to barrel exports
- `packages/client/src/lib/traductions.api.ts` — refinements
- `packages/server/src/index.ts` — /api/demandes mounted; cleaned up commented-out route stubs
- `packages/server/src/modules/document/` — controller/service/types/route/errors refinements
- `packages/server/src/modules/traduction/` — controller/service/route refinements
- `packages/server/src/utils/traduction.ts` — refinements
- `packages/server/src/db/schema.ts` — minor additions
- `docs/TASKS.md` — Sprint 4 complete, Sprint 5 items

---

## [f292f88] — 2026-06-29 — feat(sprint3+sprint4): Missions client done + M6 Traduction + M7 Glossaire + translate-service

### Added — Sprint 3 Client (Missions complete)
- `packages/client/src/pages/MissionsPage.tsx` — two-column inbox layout, filters, mission list + detail panel
- `packages/client/src/pages/missions/components/MissionDetails.tsx` — full detail: participants, dates, rapport link, recommandations
- `packages/client/src/pages/missions/components/MissionFormPage.tsx` — création/édition with participants + rapport link

### Added — Sprint 4 translate-service
- `packages/translate-service/requirements.txt`
- `packages/translate-service/main.py` — /translate, /translate/batch, /detect, /health, DeepL fallback, text cleanup

### Added — Sprint 4 Server (M7 Glossaire + M6 Traduction)
- `packages/server/src/modules/glossaire/` — service + controller + route
- `packages/server/src/modules/traduction/` — service + controller + route
- `packages/server/src/utils/traduction.ts` — traduireSegment, traduireTexte batch, detecterLangue, verifierLibreTranslate

### Added — Sprint 4 Client (Glossaire)
- `packages/client/src/lib/glossaire.api.ts` — lister, getById, suggestions, creer, mettreAJour
- `packages/client/src/lib/traductions.api.ts` — lister, getById, moteurStatus, lancer, correction, approuver, archiver, suggestions
- `packages/client/src/pages/GlossairePage.tsx` — CRUD termes, suggestions, pagination

### Changed
- `packages/server/src/index.ts` — mounted /api/glossaire + /api/traductions
- `packages/client/src/App.tsx` — missions routes wired (4 routes) + /glossaire route
- `packages/client/src/lib/api.ts` — glossaireApi + traductionsApi added to barrel exports
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — em dash → hyphen in empty date + expiry alert
- `docs/TASKS.md` — Sprint 3 complete, Sprint 4 server items checked

---

## [1ec9cca] — 2026-06-29 — feat(sprint3): M1 Accords + M4 Courriers + M3 Missions server + client (partial)

### Added — Server
- `packages/server/src/modules/accords/` — CRUD service + controller + route (lister, creer, mettreAJour, renouveler, getAccordsExpirantDans)
- `packages/server/src/modules/courriers/` — CRUD service + controller + route (lister, creer, mettreAJour, getSansReponse, getFilCorrespondance)
- `packages/server/src/modules/missions/` — CRUD service + controller + route (lister, creer, mettreAJour, recommandations CRUD, getRecommandationsEnAttente)
- `packages/server/src/jobs/alertes.ts` — cron 08h00 daily, 30/60/90-day expiry alerts for accords, email admins

### Added — Client
- `packages/client/src/lib/accords.api.ts` — accords API client
- `packages/client/src/lib/courriers.api.ts` — courriers API client
- `packages/client/src/lib/missions.api.ts` — missions API client
- `packages/client/src/pages/AccordsPage.tsx` — two-column inbox layout, filters, expiry badges
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — read-only detail view
- `packages/client/src/pages/accords/components/AccordFormPage.tsx` — create/edit with doc upload (Option C)
- `packages/client/src/pages/CourriersPage.tsx` — inbox layout, direction/status filters, urgency flags
- `packages/client/src/pages/courriers/components/CourrierDetail.tsx` — full detail + reply thread
- `packages/client/src/pages/courriers/components/CourrierFormPage.tsx` — create/edit/reply, doc + accord links

### Changed
- `packages/server/src/index.ts` — mounted /api/accords, /api/courriers, /api/missions; added morgan logging; demarrerJobsAlertes() at startup
- `packages/server/src/db/schema.ts` — added `document_id` column to `courriers` table
- `packages/client/src/App.tsx` — wired accords and courriers routes (4 each)
- `packages/client/src/lib/api.ts` — accords/courriers/missions added to barrel exports
- `docs/TASKS.md` — Sprint 3 server complete, client Accords+Courriers complete

---

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
| 2026-06-30 | ccbd3f2 | Sprint 5 Wave 2 — Jobs module (REGISTRE_JOBS) + major page + service refinements |
| 2026-06-30 | f9b14f8 | Sprint 5 Wave 1 — Dashboard M9 + AdminParametresPage + Notifications + ModalRelance |
| 2026-06-29 | 9e67bee | Sprint 4 — M5 Demandes server+client + TraductionsPage + TraductionEditeur + DemandesPage |
| 2026-06-29 | f292f88 | Sprint 3 Missions client + Sprint 4 M6+M7 server + translate-service + GlossairePage |
| 2026-06-29 | 1ec9cca | Sprint 3 — M1 Accords + M4 Courriers + M3 Missions server; client Accords+Courriers |
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
