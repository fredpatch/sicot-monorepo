You are acting as a Senior Frontend Engineer, UX/UI Architect, Product Usability Specialist, and Administration Console Reviewer.

Your task is to redesign and implement the SICOT “Administration” section.

Repository:
https://github.com/fredpatch/sicot-monorepo.git

Primary frontend location:
packages/client

The attached image is the visual reference for the target direction.

Use it to understand:

- normalized SICOT administration styling
- clear separation between configuration and operations
- parameter grouping
- monitoring hierarchy
- manual jobs
- system health visibility
- AI usage monitoring
- safety around administrative actions
- responsive behavior

Do NOT reproduce the mockup blindly.

First inspect the current implementation and classify every element into:

1. Real configurable setting
2. Real monitoring data
3. Real executable job
4. Future monitoring placeholder
5. Unsupported/mockup-only information

Do not fabricate production telemetry.

Do not modify unrelated modules.

Do not commit or push changes unless explicitly requested.

---

# 1. Collaboration mode

Work incrementally.

Use:

✅ Done
⏳ Current
🔜 Next

Follow:

1. Audit current Administration implementation
2. Report actual settings / monitoring / jobs
3. Classify mockup data as real vs future placeholder
4. Propose information architecture
5. Implement incrementally
6. Validate
7. Return final report

Do not start implementation before returning Phase 1.

---

# 2. Product purpose

The Administration section is SICOT’s privileged system-operations console.

It currently combines:

- configurable business thresholds
- security configuration
- backup retention settings
- translation-engine fallback settings
- AI/Gemini quota configuration
- Gemini usage monitoring
- translation engine status
- automated report status
- maintenance jobs
- backup jobs
- analytics snapshot jobs
- monthly report generation
- manual execution of scheduled operations

The redesign must make these responsibilities easier to understand and safer to operate.

---

# 3. Current access model

Current route:

/admin/*

Current route protection:

AdminRoute

Audit whether all Administration endpoints require:

admin
or
super_admin

The existing page text appears to indicate some parameters are specifically reserved to Super Admin.

Do not rely only on page-level route protection.

Audit backend role requirements for:

- parameter listing
- parameter update
- jobs listing
- job execution
- Gemini monitoring
- translation engine monitoring

If some operations are super_admin-only, reflect this in the capability layer and UI.

---

# 4. Files to inspect first

Inspect at least:

packages/client/src/pages/AdminParametresPage.tsx

packages/client/src/lib/parametres.api.ts
packages/client/src/lib/analytics.api.ts
packages/client/src/lib/api.ts
packages/client/src/lib/traductions.api.ts

packages/client/src/App.tsx
packages/client/src/router.tsx
packages/client/src/components/layouts/Layout.tsx
packages/client/src/components/ui

Also inspect server-side modules for:

- parameters
- parameter validation
- parameter audit logging
- job registry
- job execution
- scheduled jobs / cron configuration
- Gemini usage status
- translation engine status
- backup jobs
- monthly report generation

Confirm real behavior before changing UI.

---

# 5. Current real parameter model

Current frontend shape:

interface Parametre {
id: number
cle: string
valeur: string
type: ParametreType
module: string
description?: string
modifiePar?: number
createdAt: string
updatedAt: string
}

Known parameter types:

- entier
- booleen
- string or equivalent

Preserve backend keys.

Do not rename stored keys.

---

# 6. Current known parameters

Known current labels/keys include at least:

accord_alerte_jours
courrier_alerte_jours
courrier_alerte_critique_jours
recommandation_alerte_jours

otp_expiration_minutes
lockout_max_tentatives
lockout_duree_minutes

backup_retention_locale_jours
backup_retention_nas_jours

deepl_fallback_actif

Also inspect Gemini-related parameter keys such as:

gemini_quota_journalier_par_modele
gemini_rapports_manuels_max_jour

Do not hardcode the redesign around only this exact list if parameters are returned dynamically.

---

# 7. Parameter grouping

Current backend already exposes:

module

Use that as the basis for logical sections.

Known module labels currently include:

M1 → Accords & Partenariats
M3 → Missions & Recommandations
M4 → Correspondances
NOTIF → Notifications
ADMIN → Administration
M10 → Sécurité & Système

Audit all real module values.

Do not invent categories that cannot map to existing settings.

The UI can group them into friendlier presentation sections such as:

Métier
Sécurité
Sauvegardes
Traduction
IA & Rapports

while preserving the real backend module/key mapping.

---

# 8. Target information architecture

Replace the single long page with a clearer administration console.

Recommended top-level tabs:

Paramètres
Monitoring & Jobs

Optional third tab only if justified:

Infrastructure

Do not split into too many routes unless necessary.

Preferred:

/admin

with tabs driven by search params if useful:

/admin?tab=settings
/admin?tab=monitoring

Preserve current route compatibility where practical.

---

# 9. Tab A — Paramètres

Purpose:

Configure system rules and thresholds.

Recommended sections:

- Métier
- Sécurité & Authentification
- Sauvegardes
- Traduction
- IA & Rapports

Only display sections that contain real parameters.

---

# 10. Parameter cards

Keep the current concise card idea, but normalize it.

Each setting card should show:

- friendly label
- description
- input/control
- unit
- current raw key as secondary technical metadata
- save state
- validation error
- optional warning

Example:

Alerte échéance accord

Nombre de jours avant expiration pour déclencher une alerte accord.

[ 90 ] jours

accord_alerte_jours

Do not expose keys as primary content.

---

# 11. Parameter editing behavior

Current behavior:

- change local value
- detect dirty state
- save one parameter at a time
- show inline success state
- invalidate parameter query

Preserve this unless a bulk-save approach is clearly better.

Do not silently auto-save unless current server semantics and UX justify it.

Given the administrative risk, explicit per-setting save is acceptable.

---

# 12. Validation

Current integer validation checks positive integer syntax.

Audit backend validation for:

- min
- max
- allowed boolean values
- key-specific constraints

Frontend validation must not conflict with backend.

Examples requiring scrutiny:

OTP expiration
Lockout attempts
Lockout duration
Retention days
Alert thresholds
Gemini quotas

Do not allow obviously dangerous values such as:

negative retention
negative lockout
invalid numeric strings

If backend exposes constraints, centralize them.

---

# 13. Units

Current helper derives:

_jours → jours
_minutes → min

Preserve or improve this.

Centralize unit mapping.

Do not infer units for unknown keys incorrectly.

Possible utility:

getParameterUnit(parametre)

Use explicit override map where necessary.

---

# 14. Save feedback

Use compact inline states:

Modifié

Enregistrement...

Enregistré

Erreur

Avoid excessive global toasts for normal success.

Use toasts for errors.

Do not reset user-entered values unexpectedly on failed save.

---

# 15. Audit warning

The current page tells the administrator that changes are logged.

Keep this prominently.

Suggested wording:

Les modifications de paramètres sont journalisées dans le Journal d’audit.

If parameters take effect only on the next scheduled cycle, preserve that information where accurate.

Example:

Les nouveaux seuils seront utilisés lors du prochain cycle planifié.

Do not generalize this statement to settings that take effect immediately unless true.

---

# 16. DeepL fallback setting

Current parameter:

deepl_fallback_actif

Current engine status also exposes:

deeplConfigure

Preserve the useful cross-check.

If fallback is enabled but API key is missing:

Display a warning.

Example:

Fallback DeepL activé, mais la configuration serveur est incomplète.

Do not expose API keys.

Do not allow admins to edit secrets through this page unless a dedicated secure secret-management system exists.

---

# 17. Security settings

Group:

OTP expiration
Failed-attempt threshold
Lockout duration

Potential title:

Authentification & sécurité

Show concise consequence descriptions.

Example:

Tentatives avant blocage
Nombre d’échecs de connexion avant verrouillage temporaire.

Do not turn these controls into generic text inputs without validation.

---

# 18. Backup retention settings

Group:

Rétention sauvegarde locale
Rétention sauvegarde NAS

Clearly distinguish:

retention policy

from:

manual backup execution

Retention belongs in Paramètres.

Backup execution belongs in Monitoring & Jobs.

Do not mix them.

---

# 19. IA & report quota settings

Group current Gemini configuration separately.

Examples:

Quota journalier Gemini par modèle

Rapports IA manuels maximum par jour

These are limits/configuration.

Current usage belongs in Monitoring.

Keep those concepts separate.

---

# 20. Tab B — Monitoring & Jobs

Purpose:

Observe system-operational state and manually trigger supported maintenance jobs.

Recommended sections:

- Aperçu système
- Traduction
- Usage IA
- Jobs manuels

Only show real telemetry.

---

# 21. Real Gemini monitoring

Current real query:

analyticsApi.getStatutGemini()

Current known response includes:

modeles

with values such as:

modele
appelsAujourdhui
plafond
thinkingTokensAujourdhui

and:

rapportsIA.utilises
rapportsIA.max

and:

dernierRapportMensuel

Preserve this.

Do not replace with fake telemetry.

---

# 22. Gemini usage cards

Keep the current model cards, but normalize them.

For each model show:

- model label
- calls today / configured cap
- progress bar
- thinking tokens today

Example:

Gemini 2.5 Flash

4 / 15 appels aujourd’hui

████░░░

1 242 tokens de réflexion

Use actual response values.

---

# 23. Usage thresholds

Current visual logic:

> = 90% → danger
> = 70% → attention
> otherwise → success

This is reasonable.

Centralize it.

Do not duplicate percentage thresholds across components.

Suggested:

getUsageTone(used, max)

---

# 24. Reports IA monitoring

Show:

Rapports IA à la demande

X / Y générés aujourd’hui

Also:

Dernier rapport mensuel automatique

with real creation date if available.

Do not show fake generation history.

---

# 25. Translation engine status

The page already fetches:

traductionsApi.moteurStatus()

Audit response.

Known:

accessible
deeplConfigure

Use this in Monitoring.

Suggested card:

Moteur de traduction

LibreTranslate
Opérationnel / Indisponible

Fallback DeepL
Configuré / Non configuré

Do not imply DeepL is being actively used if only configured as fallback.

---

# 26. Jobs model

Current frontend knows:

interface JobDisponible {
cle
label
description
roleMinimum
module
}

Current execution result:

interface JobResultat {
cle
succes
resume
erreur?
dureeMs
}

Preserve this model.

---

# 27. Current jobs

Audit the exact current list from:

jobsApi.lister()

Known examples include:

- Mise à jour statuts accords expirés
- Alertes échéances accords
- Vérification criticité courriers
- Vérification recommandations en retard
- Sauvegarde locale immédiate
- Capture criticité courriers (historique)
- Générer le rapport mensuel
- Sauvegarde NAS immédiate

Do not hardcode labels if backend already provides them.

---

# 28. Jobs registry

Render manual jobs as a structured operational list/table.

Recommended columns:

- Job
- Module
- Dernier résultat
- Durée
- Action

But:

Last result and duration are only available after current-session execution unless backend provides history.

Do not fabricate historical execution metadata.

If persistent job history is unavailable:

Show:

Dernier résultat
Non disponible

until the job is executed in this session.

Or omit the column.

---

# 29. Future monitoring placeholders

The mockup shows concepts such as:

- Jobs OK (24h)
- Success rate
- Last run timestamp
- Warning count
- Last backup timestamp
- Job history

These are useful future monitoring fields.

If backend does not currently expose them:

They may be implemented as clearly marked placeholders.

Rules:

Do not hardcode fake numbers.

Use:

Non disponible
Historique non exposé
À venir

If a card would be visually useless with no real data, omit it instead.

---

# 30. Placeholder architecture

As with the Utilisateurs redesign:

classify monitoring elements as:

available
future
unsupported

Do not scatter hardcoded placeholder values.

Suggested presentation model:

interface MonitoringMetric {
label: string
value?: string | number
availability: 'available' | 'future'
}

Keep it simple.

---

# 31. Manual job execution safety

Manual jobs are privileged operational actions.

Do not use casual one-click execution for sensitive jobs without confirmation.

Recommended categories:

Low-risk:

- recompute status
- capture analytics

Medium/high risk:

- backups
- monthly report generation
- bulk alert emails

For jobs with side effects:

Open a confirmation dialog.

Example:

Lancer “Alertes échéances accords” ?

Cette opération peut envoyer des notifications aux utilisateurs concernés.

[Annuler] [Lancer]

Use backend job description to inform the user.

---

# 32. Duplicate execution protection

While a job is running:

- disable its action
- show spinner/progress state
- prevent repeated submission

Current code already tracks:

jobEnCours

Preserve this.

Do not block every job if only one job is running unless backend requires serialized execution.

Audit whether concurrent job execution is safe.

---

# 33. Job results

After execution, show:

Succès

or:

Échec

Then:

summary

duration

error if present

Example:

Succès

12 accords mis à jour.

1.8 s

For failure:

Échec

Connexion NAS impossible.

Do not hide server error summaries.

Do not expose stack traces.

---

# 34. Job result persistence

Current result state appears frontend-local:

resultatsJobs

This disappears on reload.

Preserve this behavior unless job history exists server-side.

Do not imply persistent history.

If no history API exists, remove mockup action:

Voir l’historique des jobs

or present it as a future placeholder only if explicitly desired.

---

# 35. System overview cards

Use only metrics available from real APIs.

Possible real cards:

Moteur traduction

Gemini usage

Dernier rapport mensuel

Number of available jobs

Number of configurable parameters

The counts of parameters/jobs can be derived from complete returned arrays, not pagination.

Acceptable.

Do not create:

System health score

unless a meaningful health model exists.

---

# 36. Admin vs Super Admin capabilities

Audit:

JobDisponible.roleMinimum

This is important.

Use it to determine whether a job action is executable.

Example:

roleMinimum === super_admin

Then admin may see the job but cannot launch it, if that is desired.

Preferred UX:

show:

Réservé Super Admin

rather than a mysteriously disabled launch button.

Do not rely only on frontend enforcement.

---

# 37. Parameter permissions

Audit parameter update role.

If only Super Admin can update settings:

Admins may potentially get a read-only monitoring view.

Do not expose editable controls to unauthorized admins.

Build capabilities centrally.

Example:

canEditParameter
canRunJob

---

# 38. Capability architecture

Suggested utility/hook:

getAdminCapabilities(user)

and:

canRunJob(user, job)

Do not scatter role comparisons throughout components.

---

# 39. Search/filter for jobs

If the job list remains small, do not overbuild.

Useful filter:

Module
Status of current-session result

Only implement when helpful.

No search required for fewer than ~10 jobs.

---

# 40. Monitoring refresh

Current Gemini status refreshes every 60 seconds.

Preserve this.

Show subtle:

Actualisé automatiquement

Do not show a manual refresh button unless useful.

Translation engine status may use similar periodic refresh if appropriate.

Avoid excessive polling.

---

# 41. Responsive behavior

Desktop:

- tabs
- parameter cards in 2–4 column grid
- monitoring cards
- jobs table/list

Tablet:

- 2-column parameter cards
- stacked monitoring groups

Mobile:

- single-column settings cards
- jobs as cards
- confirmation dialogs
- no horizontal overflow

Administration is likely desktop-first, but should remain usable on smaller screens.

---

# 42. Component architecture

Suggested structure:

packages/client/src/pages/admin/
├── components/
│ ├── AdminTabs.tsx
│ ├── AdminInfoBanner.tsx
│ ├── ParameterSection.tsx
│ ├── ParameterCard.tsx
│ ├── ParameterInput.tsx
│ ├── TranslationEngineStatusCard.tsx
│ ├── GeminiUsageSection.tsx
│ ├── GeminiModelCard.tsx
│ ├── AdminSystemOverview.tsx
│ ├── JobsList.tsx
│ ├── JobRow.tsx
│ ├── JobExecutionDialog.tsx
│ ├── JobResultBadge.tsx
│ └── FutureMonitoringMetric.tsx
├── hooks/
│ ├── useParametersQuery.ts
│ ├── useParameterMutations.ts
│ ├── useAdminMonitoringQueries.ts
│ └── useJobs.ts
├── admin.permissions.ts
├── admin.types.ts
├── admin.utils.ts
├── admin.constants.ts
└── AdminPage.tsx

Adapt to current structure.

Do not restructure everything purely to match this suggestion.

---

# 43. Shared normalization

Reuse existing normalized SICOT primitives:

- page header
- tabs
- cards
- alert/banner
- status badges
- confirmation dialog
- loading/error states
- responsive grids

Do not duplicate the entire design system.

---

# 44. Error handling

Handle:

- parameter list failure
- parameter update failure
- jobs list failure
- job execution failure
- Gemini status failure
- translation engine status failure

Do not return null for significant operational failures.

Monitoring sections should fail independently where possible.

Example:

Gemini monitoring unavailable.

should not prevent editing authentication settings.

---

# 45. Loading states

Use section-level loading.

Do not block the entire Administration page while one monitoring API loads.

Examples:

Parameters skeleton

Gemini cards skeleton

Jobs list skeleton

Translation status skeleton

---

# 46. Security

Administration contains sensitive controls.

Audit:

- CSRF
- server authorization
- parameter key allowlisting
- job allowlisting

Do not allow arbitrary job key execution from frontend.

Use only jobs returned by jobsApi.lister() or known secure server identifiers.

Do not expose:

- environment variables
- API keys
- database connection strings
- backup credentials
- Gemini secrets
- DeepL secrets

---

# 47. Audit integration

Parameter changes are already stated to be audit logged.

Confirm this server-side.

If job execution is also audit logged, surface this in the UI.

Suggested:

Cette action sera enregistrée dans le Journal d’audit.

Do not claim audit coverage if absent.

If jobs are not currently logged, report that as a security recommendation rather than pretending.

---

# 48. Future monitoring telemetry recommendations

If backend lacks job history, recommend later adding:

job_executions:

- id
- jobKey
- startedAt
- finishedAt
- success
- durationMs
- triggeredBy
- summary

This is a recommendation only.

Do not implement a new persistence subsystem unless explicitly approved.

Similarly useful future fields:

lastBackupAt
lastSuccessfulBackupAt
lastJobRunAt

Keep them out of current fake data.

---

# 49. Testing and validation

At minimum validate:

## Access

- admin access
- super_admin access
- unauthorized role blocked
- direct URL protected

## Parameters

- list
- integer edit
- boolean edit
- save
- unchanged save disabled
- invalid integer
- API validation error
- success state
- units
- DeepL configuration warning

## Security parameters

- OTP expiration
- lockout attempts
- lockout duration

## Backup parameters

- local retention
- NAS retention

## Business thresholds

- agreement alert threshold
- courrier thresholds
- recommendation threshold

## IA configuration

- Gemini quotas
- manual report limit

## Monitoring

- Gemini models
- quota progress
- usage tone
- reports IA
- last automated report
- translation engine online
- translation engine offline
- DeepL configured / unconfigured
- monitoring API failure

## Jobs

- jobs load
- roleMinimum honored
- launch
- confirmation
- duplicate launch prevented
- success result
- failure result
- duration
- summary
- job API failure

## Placeholders

- no fake last-run timestamps
- no fake success percentages
- no fake backup times
- future telemetry clearly marked or omitted

## Responsive

- desktop
- tablet
- mobile
- no overflow

## Accessibility

- tabs
- inputs
- units
- save buttons
- job confirmation
- result status
- monitoring progress semantics

Also run:

- TypeScript
- ESLint
- production build
- no console errors

Do not claim validation passed unless executed.

---

# 50. Expected implementation sequence

## Phase 1 — Audit

Return:

1. Current Administration files
2. Parameter API contracts
3. All current parameter keys/types/modules
4. Parameter validation
5. Parameter permissions
6. Job API contracts
7. Current jobs
8. roleMinimum behavior
9. Job audit behavior
10. Gemini monitoring payload
11. Translation engine status payload
12. Current cron/scheduled behavior
13. Real mockup metrics
14. Future placeholder metrics
15. Unsupported mockup metrics
16. Existing shared SICOT components
17. Backend dependencies
18. Proposed file changes
19. Risks

Do not implement yet.

## Phase 2 — Plan

Return:

1. Administration information architecture
2. Settings-tab structure
3. Parameter grouping
4. Monitoring structure
5. Gemini presentation
6. Translation engine presentation
7. Jobs presentation
8. Job safety/confirmation strategy
9. Capability architecture
10. Placeholder strategy
11. Responsive strategy
12. Accessibility strategy
13. Backend changes if unavoidable
14. Implementation order

## Phase 3 — Parameters redesign

Implement:

1. tabs/shell
2. information banner
3. parameter grouping
4. parameter cards
5. validation
6. units
7. save states
8. permissions
9. error states

Validate.

## Phase 4 — Monitoring redesign

Implement:

1. system overview using real data
2. translation engine status
3. Gemini usage
4. report quota/status
5. monitoring failures
6. placeholder telemetry only where deliberately retained

Validate.

## Phase 5 — Jobs redesign

Implement:

1. jobs registry
2. role capability
3. execution confirmation
4. running state
5. success/failure result
6. duration/summary
7. safe handling

Validate.

## Phase 6 — Security/audit regression

Verify:

- route guards
- backend permissions
- parameter audit
- job audit if supported
- no secret exposure

## Phase 7 — Final validation

Run:

TypeScript
ESLint
build
targeted functional checks

Fix regressions.

## Phase 8 — Final report

Return:

1. Summary
2. Files created
3. Files modified
4. Settings architecture
5. Parameter changes
6. Monitoring changes
7. Gemini monitoring
8. Translation engine monitoring
9. Jobs redesign
10. Safety confirmations
11. Capability handling
12. Placeholder telemetry implemented
13. Future telemetry recommendations
14. Backend/API changes
15. Security/audit decisions
16. Accessibility
17. Responsive behavior
18. Validation commands
19. Validation results
20. Remaining recommendations

---

# 51. Acceptance criteria

The task is complete when:

- Administration follows normalized SICOT styling.
- Settings and operational jobs are clearly separated.
- Current parameters remain editable.
- Current parameter keys/backend contracts remain intact.
- Security parameters are grouped coherently.
- Backup retention is separated from backup execution.
- Translation fallback configuration remains functional.
- Gemini quotas remain configurable.
- Gemini usage monitoring remains functional.
- Translation engine state remains visible.
- Manual jobs remain functional.
- Job role restrictions are respected.
- Sensitive jobs require appropriate confirmation.
- Running jobs cannot be accidentally triggered repeatedly.
- Execution results are visible.
- No fake persistent job history is introduced.
- No fake job success-rate data is introduced.
- No fake last-backup timestamp is introduced.
- Future monitoring placeholders are explicit when retained.
- Parameter changes remain auditable.
- Admin/security permissions remain enforced server-side and client-side.
- Sections fail independently when monitoring services are unavailable.
- Desktop/tablet/mobile are supported.
- Accessibility requirements are met.
- TypeScript/lint/build pass.
- No unrelated modules are modified.
- Final report is returned.

---

# 52. Restrictions

Do not:

- Rewrite the complete administration backend.
- Rename persisted parameter keys.
- Add arbitrary parameter keys from the frontend.
- Expose environment secrets.
- Expose Gemini API keys.
- Expose DeepL API keys.
- Expose backup credentials.
- Allow arbitrary job execution.
- Fake job history.
- Fake last-run times.
- Fake success rates.
- Fake warning counts.
- Fake backup timestamps.
- Add monitoring data unsupported by the backend without marking it as future.
- Mix backup retention configuration with backup execution.
- Remove existing Gemini monitoring.
- Remove DeepL configuration warning.
- Remove existing manual jobs.
- Allow unauthorized admins to run super_admin-only jobs.
- Replace React Query.
- Replace Tailwind.
- Introduce another UI library.
- Modify unrelated modules.
- Commit or push changes.

Start with Phase 1 only.

Inspect the updated repository and return the audit report before writing implementation code.
