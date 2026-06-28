# 🎯 Current Task

**Session date**: 2026-06-28
**Status**: 🟡 Sprint 2 — OCR microservice complete, starting Documents module

## What Just Finished

- ✅ exploration-cache initialized and pushed (`43a858d`)
- ✅ OCR microservice built (`packages/ocr-service/main.py`) — Flask + Waitress, port 5001
- ✅ `packages/server/src/utils/ocr.ts` — TypeScript HTTP client for OCR service
- ✅ `server/index.ts` updated — OCR health check at startup
- ✅ `packages/server/package.json` — added `axios`, `form-data`, `@types/form-data`
- ✅ OCR tested on real ANAC documents — Tesseract 5, FR+EN validated
- ✅ LibreTranslate FR↔EN tested — quality acceptable for V1, apostrophe cleanup implemented

## 🚀 Now: Module Documents server (M8)

- [ ] `modules/documents/services/documents.service.ts`
  - `upload({ buffer, nomFichier, mimeType, userId })` — save file, compute MD5, call `extraireTexte()`, check dedup
  - `lister(filters)` — paginated, filters: categorie, statut_ocr, langue, uploadePar
  - `getById(id)` — with uploader info
  - `mettreAJour(id, data)` — categorie, langue corrections
  - `getVersions(parentId)` — version chain
- [ ] `modules/documents/controllers/documents.controller.ts`
- [ ] `modules/documents/routes/documents.route.ts`
  - `POST /api/documents/upload` (multer)
  - `GET /api/documents` / `GET /api/documents/:id`
  - `PATCH /api/documents/:id`
  - `GET /api/documents/:id/versions`
- [ ] Upload middleware (`middleware/upload.ts`) — multer, 50MB limit, allowed extensions
- [ ] Mount route in `index.ts`

## Next: Module Organisations (M2)

- [ ] CRUD organisations + contacts
- [ ] `/api/organisations` + `/api/contacts` routes

## Client Pages (after server)

- [ ] `DocumentsPage.tsx` — upload, OCR status, version history
- [ ] `PartenairesPage.tsx` — org + contacts table
- [ ] File upload component (drag & drop, progress)

## Progress Tracker

```
OCR microservice  ██████████ 100% ✅
Documents server  ░░░░░░░░░░   0% ← START HERE
Organisations     ░░░░░░░░░░   0%
Documents client  ░░░░░░░░░░   0%
Partenaires client░░░░░░░░░░   0%
```
