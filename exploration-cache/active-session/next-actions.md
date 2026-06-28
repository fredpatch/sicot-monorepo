# ⚡ Next Actions

Last updated: 2026-06-28

## 🔥 Immediate (start here next session)

1. **Mount document route in `server/src/index.ts`**
   - Uncomment `// app.use('/api/documents', documentsRoutes);`
   - Create the module skeleton first

2. **Create `modules/documents/` scaffold**
   ```
   packages/server/src/modules/documents/
   ├── controllers/documents.controller.ts
   ├── services/documents.service.ts
   └── routes/documents.route.ts
   ```

3. **Add multer to server dependencies**
   - Already in package.json: `"multer": "^1.4.5-lts.1"` ✅
   - Create upload middleware in `src/middleware/upload.ts`
   - Config: `dest: UPLOAD_DIR`, file size limit 50MB, accept PDF/Word/images

## 📅 Today / This Sprint

4. **Implement `documents.service.ts`** — upload, lister, getById, mettreAJour
5. **MD5 hash on upload** — use Node crypto `createHash('md5')` on file buffer, check for existing hash in DB before saving
6. **Implement `organisations.service.ts`** + controller + routes
7. **Wire organisations route** in `index.ts`

## 📆 This Week

8. **`DocumentsPage.tsx`** — table of documents, OCR status badges, version indicator
9. **`PartenairesPage.tsx`** — organisation list, filters, contacts panel
10. **File upload component** — drag & drop zone (consider react-dropzone or native)
11. **Update `App.tsx`** — uncomment `DocumentsPage`, `PartenairesPage` imports and routes

## 🗓️ Backlog (See `tasks/backlog.md`)

12. OCR integration (Tesseract — decide on npm vs Python microservice)
13. Watched folder `/temp/` auto-import cron job
14. Module Accords (M1) — Sprint 3
15. Module Courriers (M4) — Sprint 3
16. Module Missions (M3) — Sprint 3

## 📋 Definition of "Sprint 2 Done"

- [ ] `GET/POST /api/documents` working (upload + list)
- [ ] `GET/POST/PATCH /api/organisations` working
- [ ] `DocumentsPage.tsx` renders document list with filters
- [ ] `PartenairesPage.tsx` renders org list + contacts
- [ ] Upload component works end-to-end (file → server → DB → OCR queued)
- [ ] Committed and pushed to `origin/main`
