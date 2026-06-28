# 🎯 Current Task

**Session date**: 2026-06-28
**Status**: 🟡 Sprint 1 complete — preparing Sprint 2

## What Just Finished

Sprint 1 (M10 — Administration & Auth) is 100% complete and pushed to `origin/main`.

Final commit: `d51eee7` — 27 files changed, 1441 insertions
- Login page fully redesigned (framer-motion, shadcn-style components, 2-step flow)
- `packages/client/src/` restructured: `lib/`, `components/ui/`, `pages/login/`
- All API files split: `axios.ts`, `auth.api.ts`, `users.api.ts`, `audit.api.ts`, `api.ts` (barrel)
- exploration-cache initialized

## 🚀 Next: Sprint 2 — M8 Documents + M2 Partenaires

### Priority 1 — Server: Module Documents (M8)
- [ ] `modules/documents/services/documents.service.ts`
  - `upload(file, userId)` — multer integration, MD5 hash, dedup check
  - `lister(filters)` — paginated, filter by categorie/statut_ocr
  - `getById(id)` — with related user
  - `mettreAJour(id, data)` — categorie, langue corrections
  - `supprimerVersion(id)` — soft delete (mark inactive or remove version)
- [ ] `modules/documents/controllers/documents.controller.ts`
- [ ] `modules/documents/routes/documents.route.ts`
  - `POST /api/documents/upload` (multer middleware)
  - `GET /api/documents`
  - `GET /api/documents/:id`
  - `PATCH /api/documents/:id`
- [ ] OCR integration — Tesseract (likely Python microservice or `tesseract` npm)
- [ ] Watched folder `/temp/` auto-import job

### Priority 2 — Server: Module Organisations (M2)
- [ ] CRUD organisations + contacts
- [ ] Routes: standard REST on `/api/organisations`, `/api/contacts`

### Priority 3 — Client Pages
- [ ] `DocumentsPage.tsx` — upload UI, OCR status indicator, version history sidebar
- [ ] `PartenairesPage.tsx` — org list table, filters, org detail + contacts
- [ ] File upload component — drag & drop, progress bar, mime type validation

## Progress Tracker

```
Sprint 2 setup    ████░░░░░░  10% (exploration-cache done, starting code)
Documents server  ░░░░░░░░░░   0%
Organisations     ░░░░░░░░░░   0%
Documents client  ░░░░░░░░░░   0%
Partenaires client░░░░░░░░░░   0%
```
