# 📚 SICOT — Exploration Cache Index

This folder is the living knowledge base for the SICOT project. Update it as the project evolves.

**Project**: Système Intégré de Coopération Internationale et de Traduction — ANAC Gabon
**Last updated**: 2026-06-29 | **Sprint**: 3 (in progress — server complete, client Accords+Courriers done, Missions pending)

---

## 🟡 Active Session (update every session)

| File | Purpose |
|------|---------|
| [`active-session/current-task.md`](active-session/current-task.md) | What we're working on RIGHT NOW |
| [`active-session/next-actions.md`](active-session/next-actions.md) | Prioritized action items (immediate → this week) |
| [`active-session/blockers.md`](active-session/blockers.md) | What's blocking progress |
| [`active-session/context.md`](active-session/context.md) | Fresh-session orientation guide |

---

## 📋 Tasks

| File | Purpose |
|------|---------|
| [`tasks/backlog.md`](tasks/backlog.md) | All future work (Sprint 2–7), 40+ items |
| [`tasks/sprint-1.md`](tasks/sprint-1.md) | Sprint 1 — completed ✅ |
| [`tasks/completed/sprint-1-done.md`](tasks/completed/sprint-1-done.md) | Done items + lessons learned |

---

## 🏗️ Project Knowledge (mostly static)

| File | Purpose |
|------|---------|
| [`project/overview.md`](project/overview.md) | What SICOT is, 10 modules, stakeholders, status |
| [`project/architecture.md`](project/architecture.md) | Full stack, auth flow, env vars, data flow |
| [`project/database-schema.md`](project/database-schema.md) | All 15 enums + all tables with columns |
| [`project/decisions.md`](project/decisions.md) | 10 critical non-obvious decisions with rationale |

---

## 🔧 Technical Reference

| File | Purpose |
|------|---------|
| [`technical/cheat-sheet.md`](technical/cheat-sheet.md) | Commands, API routes, env vars, imports — all in one page |
| [`technical/patterns.md`](technical/patterns.md) | Code patterns: Service/Controller/Route, queries, mutations, forms |
| [`technical/conventions.md`](technical/conventions.md) | Naming, file structure, language policy, CSS rules |
| [`technical/gotchas.md`](technical/gotchas.md) | 10 known pitfalls with exact symptoms and fixes |

---

## 📅 Session History

| File | What Happened |
|------|--------------|
| [`sessions/2026-06-29.md`](sessions/2026-06-29.md) | Sprint 3 server M1+M4+M3 complete; client Accords+Courriers done; Missions pending |
| [`sessions/2026-06-28.md`](sessions/2026-06-28.md) | exploration-cache initialized, Sprint 1 reviewed |
| [`sessions/2026-06-27.md`](sessions/2026-06-27.md) | Login redesign, lib split, shadcn components, commit d51eee7 |

---

## 📝 Other

| File | Purpose |
|------|---------|
| [`changelog.md`](changelog.md) | Full commit history with what changed per commit |
| [`quick-ref.md`](quick-ref.md) | Human-readable one-pager (print this out) |
| [`manifest.json`](manifest.json) | Machine-readable index with search tags |

---

## 🔄 How to Keep This Up to Date

### Every session start
1. Read `active-session/context.md`
2. Read `active-session/current-task.md`
3. Check `active-session/blockers.md`

### During a session
- Update `active-session/next-actions.md` as items are checked off
- Note any new blockers in `active-session/blockers.md`

### End of session
1. Create or update `sessions/YYYY-MM-DD.md` with what was done
2. Update `active-session/current-task.md` with new state
3. Update `active-session/next-actions.md` with updated priorities
4. Update `changelog.md` if commits were made
5. Update `tasks/sprint-X.md` statuses
6. Commit the exploration-cache changes with `chore(docs): update exploration-cache`
