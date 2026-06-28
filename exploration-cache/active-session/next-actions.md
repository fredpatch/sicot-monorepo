# ⚡ Next Actions

Last updated: 2026-06-28

## 🔥 Immediate (start here next session)

1. **Create `middleware/upload.ts`**
   - multer already in package.json ✅
   - Config: `dest: UPLOAD_DIR`, 50MB limit, filter by extension (.pdf .docx .doc .txt .xlsx .xls .jpg .png .tiff)

2. **Create `modules/documents/` scaffold**
   ```
   packages/server/src/modules/documents/
   ├── controllers/documents.controller.ts
   ├── services/documents.service.ts
   └── routes/documents.route.ts
   ```

3. **Implement `documents.service.ts`**
   - `upload()`: save file → MD5 hash → dedup check → call `extraireTexte()` → insert to DB
   - MD5: use `crypto.createHash('md5').update(buffer).digest('hex')`
   - OCR call: `import { extraireTexte } from '../../../utils/ocr'` (already exists ✅)
   - `lister()`, `getById()`, `mettreAJour()`, `getVersions()`

4. **Mount in `index.ts`** — uncomment `app.use('/api/documents', documentsRoutes)`

## 📅 Today / This Sprint

5. **Implement `organisations.service.ts`** + controller + routes — standard CRUD
6. **Wire organisations route** in `index.ts`
7. **`DocumentsPage.tsx`** — list, upload button, OCR status badge, version number
8. **File upload component** — drag & drop (native or react-dropzone)

## 📆 This Week

9. **`PartenairesPage.tsx`** — org list + contacts panel, filters pays/région/type
10. **Update `App.tsx`** — uncomment DocumentsPage, PartenairesPage routes
11. **Watched folder job** (`src/jobs/watchFolder.ts`) — poll `/temp/`, auto-import

## 🗓️ Backlog (See `tasks/backlog.md`)

12. Module Accords (M1) — Sprint 3
13. Module Courriers (M4) — Sprint 3
14. Module Missions (M3) — Sprint 3

## 📋 Definition of "Sprint 2 Done"

- [ ] `GET/POST /api/documents` working (upload + list)
- [ ] `GET/POST/PATCH /api/organisations` working
- [ ] `DocumentsPage.tsx` renders document list with filters
- [ ] `PartenairesPage.tsx` renders org list + contacts
- [ ] Upload component works end-to-end (file → server → DB → OCR queued)
- [ ] Committed and pushed to `origin/main`
