# ⚡ Next Actions

Last updated: 2026-06-28

## 🔥 Immediate (start here next session)

1. **Scaffold `modules/organisations/`** — standard CRUD
   ```
   packages/server/src/modules/organisations/
   ├── controllers/organisations.controller.ts
   ├── services/organisations.service.ts
   └── routes/organisations.route.ts
   ```
   - `lister()`, `getById()`, `creer()`, `mettreAJour()`, `archiver()`
   - Mount: `app.use('/api/organisations', organisationsRoutes)` in `index.ts`

2. **`DocumentsPage.tsx`** (client)
   - List with columns: nom, catégorie, OCR status badge, langue, taille, date
   - Upload button → modal with drag & drop + catégorie selector
   - Doublon warning (207 response handling)

3. **File upload component** — `packages/client/src/components/ui/file-upload.tsx`
   - Drag & drop zone, file type validation client-side, progress indicator
   - Pre-upload MD5 check via `GET /api/documents/doublon?hash=…`

## 📅 Today / This Sprint

4. **Wire organisations route** in `index.ts`
5. **`PartenairesPage.tsx`** — org list + contacts panel, filters pays/région/type
6. **`documents.api.ts`** — client API module for documents

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
