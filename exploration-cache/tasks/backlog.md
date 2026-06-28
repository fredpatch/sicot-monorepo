# 📋 SICOT – Full Backlog

Last updated: 2026-06-28

## 🔥 Sprint 2 — M8 Documents + M2 Partenaires

### Technical Decisions Made ✅
- OCR: **Python microservice** (Flask, port 5001) — NOT npm package. Already built and tested.
- Formats: `.pdf .docx .doc .txt .xlsx .xls .jpg .jpeg .png .tiff .tif`
- PDF strategy: pdfplumber (native) → auto-fallback to pdf2image+Tesseract (scanned) per page
- `.doc` format: LibreOffice headless conversion → docx → python-docx
- Text cleanup: apostrophe normalization implemented (identified from LibreTranslate tests)
- Language detection: `langdetect` library in OCR service
- OCR client: `packages/server/src/utils/ocr.ts` (`extraireTexte()`, `verifierServiceOCR()`)

### Server
- [ ] `middleware/upload.ts` — multer, 50MB limit, filter by extension
- [ ] `modules/documents/` — service + controller + routes
  - [ ] `upload()` — save file, MD5 hash, dedup check, call `extraireTexte()`, insert to DB
  - [ ] `lister()` — paginated, filters: categorie, statut_ocr, langue, uploadePar
  - [ ] `getById()` — with uploader info
  - [ ] `mettreAJour()` — categorie, langue corrections post-upload
  - [ ] `getVersions(parentId)` — version chain
- [ ] ✅ `utils/ocr.ts` — already done
- [ ] Watched folder job (`src/jobs/watchFolder.ts`) — poll `/temp/`, auto-import on new file
- [ ] `modules/organisations/` — service + controller + routes
  - [ ] `lister()` — filters: type, pays, region, actif
  - [ ] `getById()` — with contacts
  - [ ] `creer()` / `mettreAJour()` / `toggleActif()`
- [ ] `modules/contacts/` — CRUD attached to organisations
- [ ] Mount routes in `index.ts`

### Client
- [ ] `DocumentsPage.tsx` — document list, upload button, OCR status badges, version history sidebar
- [ ] File upload component — drag & drop zone, progress bar, file type validation
- [ ] `PartenairesPage.tsx` — org table, filters (pays/région/type), detail drawer with contacts
- [ ] Contact management sub-component (add/edit/remove contacts per org)
- [ ] Uncomment routes in `App.tsx`

---

## 📦 Sprint 3 — M1 Accords + M4 Correspondances + M3 Missions

### Server
- [ ] `modules/accords/` — CRUD, statut transitions, reference generation (ACC-2026-XXXX)
- [ ] `modules/accordsOrganisations/` — many-to-many link management
- [ ] Accord renewal flow — create new version linked to parent via `parent_id`
- [ ] Expiry alerts cron — email 30/60/90 days before `date_expiration` (configurable)
- [ ] `modules/courriers/` — CRUD, reference generation (CORR-2026-XXXX), reply chain
- [ ] Deadline tracker for courriers with `reponse_requise: 'oui'`
- [ ] `modules/missions/` — CRUD, participants management
- [ ] `modules/recommandations/` — CRUD per mission, deadline alerts (if date_limite set)
- [ ] PDF/DOCX export (Puppeteer for PDF, ExcelJS for Excel) — accords, courriers, mission reports

### Client
- [ ] `AccordsPage.tsx` — accord list, fiche detail, partner tags, version history
- [ ] `CourriersPage.tsx` — inbox/outbox tabs, reply thread view, deadline flags (red if overdue)
- [ ] `MissionsPage.tsx` — mission list, planning view, report upload or form, recommendations list

---

## 🤖 Sprint 4 — M6 Traduction IA + M7 Glossaire + M5 Demandes

### Server
- [ ] LibreTranslate integration — self-hosted REST call, FR↔EN
- [ ] DeepL fallback (pending DG approval) — configure as optional via env `USE_DEEPL=true`
- [ ] `modules/traductions/` — segmented translation, diff tracking (texte_ia vs texte_final)
- [ ] Glossary suggestions injection — match `terme_fr`/`terme_en` in source text before translation
- [ ] `modules/glossaire/` — CRUD + import script (CSV/Excel via ExcelJS)
- [ ] `modules/glossaireHistorique/` — auto-log on every term update
- [ ] `modules/demandes/` — inbox, auto-assign with DB lock (`verrou = true`), priority validation
- [ ] Export DOCX for translated free-text (ExcelJS or docx npm package)

### Client
- [ ] Side-by-side translation editor — original left / editable translation right
- [ ] Glossary term highlighter — overlay on source text for known terms
- [ ] `DemandesPage.tsx` — kanban-style pipeline (Soumise → En cours → En relecture → Validée)
- [ ] `GlossairePage.tsx` — term table, import CSV UI, history drawer
- [ ] `TraductionsPage.tsx` — translation list with workflow status

---

## 📊 Sprint 5 — M9 Dashboard & Statistiques

- [ ] Dashboard 5-block layout:
  - Traductions (count by statut)
  - Correspondances sans réponse (overdue flagged red)
  - Accords expirant dans 90j (flagged amber)
  - Missions & recommandations en cours
  - Documents archivés (total + recent uploads)
- [ ] Cron: 1st of month → auto-generate PDF + Excel report → save to M8
- [ ] Manual report generation — date range picker + module selection
- [ ] PDF template — ANAC colors, logo header, professional layout (Puppeteer)
- [ ] Excel export — one tab per module (ExcelJS)
- [ ] Report history list — all generated reports, downloadable

---

## 🧪 Sprint 6 — Tests & Recette

- [ ] Functional tests — all 10 modules, real user scenarios (Mme NGO MYTOULOU + M. NDONG)
- [ ] Load tests — multi-user simultaneous access on ANAC LAN
- [ ] OCR corpus tests — ANAC accords, correspondances, mixed docs
- [ ] LibreTranslate quality tests — aeronautical corpus
- [ ] UAT — R. SOUNGOU + D-L. NTSAME, real CCIT workflows
- [ ] Bug fixes from UAT (buffer: 20% of sprint capacity)
- [ ] User manual (all profiles) — M. NDONG N'NANG
- [ ] Recette report v1.0 — signed by Mme NGO MYTOULOU

---

## 🚀 Sprint 7 — Déploiement + Formation

- [ ] Install SICOT v1.0 on SERV-APPI
- [ ] Network configuration — LAN access for all ANAC directions
- [ ] Data migration — existing Excel accords + partenaires to PostgreSQL
- [ ] Bootstrap admin validation in production
- [ ] Training: Agent & Traducteur (half-day)
- [ ] Training: Relecteur & Admin (half-day)
- [ ] Training: Direction Générale — dashboard & reports (1h)
- [ ] Handoff: user manuals + admin guide + maintenance plan

---

## ⏸️ Pending / Waiting On

| Item | Waiting on | Priority |
|------|-----------|---------|
| API Personnel ANAC | ANAC IT API docs | 🔴 High |
| Bootstrap admin flux | API Personnel | 🔴 High |
| Glossaire CCIT seed | CCIT Excel file | 🟡 Medium |
| SERV-APPI access | IT dept confirmation | 🟡 Medium |
| DeepL fallback | DG + RGPD approval | 🟢 Low |
