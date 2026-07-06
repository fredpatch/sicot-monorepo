# ⚡ SICOT - Cheat Sheet

## Commands

```bash
# Development
npm run dev                    # Start both server (3001) + client (5173)

# OCR Service (separate terminal — must be started manually)
cd packages/ocr-service
.venv\Scripts\activate         # Windows
python main.py                 # Starts on :5001

# Individual packages
npm run dev --workspace=packages/server
npm run dev --workspace=packages/client

# Database
npm run db:generate            # Generate migration from schema changes
npm run db:migrate             # Apply pending migrations
npm run db:studio              # Open Drizzle Studio (browser DB UI)

# Build
npm run build                  # Build all packages in order (shared → server → client)

# Code quality
npm run lint                   # ESLint all packages
npm run format                 # Prettier format all
```

## Key File Locations

| What | Where |
|------|-------|
| ANAC design tokens | `packages/client/src/index.css` (`@theme` block) |
| Axios instance + interceptor | `packages/client/src/lib/axios.ts` |
| Auth API calls | `packages/client/src/lib/auth.api.ts` |
| Users API calls | `packages/client/src/lib/users.api.ts` |
| Audit API calls | `packages/client/src/lib/audit.api.ts` |
| cn() utility | `packages/client/src/lib/utils.ts` |
| Button/Input/Label | `packages/client/src/components/ui/` |
| DB schema (all tables) | `packages/server/src/db/schema.ts` |
| DB instance (Drizzle) | `packages/server/src/db/index.ts` |
| Auth middleware | `packages/server/src/middleware/auth.ts` |
| Role middleware | `packages/server/src/middleware/requiredRole.ts` |
| Express entry point | `packages/server/src/index.ts` |
| Backup cron | `packages/server/src/jobs/backup.ts` |

## API Routes Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | Health check |
| POST | `/api/auth/login` | none | Login (OTP or password) |
| POST | `/api/auth/set-password` | temp cookie | First login set password |
| POST | `/api/auth/refresh` | refresh cookie | Refresh access token |
| POST | `/api/auth/logout` | none | Clear cookies |
| GET | `/api/auth/me` | access cookie | Get current user |
| GET | `/api/users` | admin | List users |
| POST | `/api/users` | admin | Create user |
| GET | `/api/users/:id` | admin | Get user |
| PATCH | `/api/users/:id` | admin | Update user |
| PATCH | `/api/users/:id/activation` | admin | Toggle active |
| POST | `/api/users/:id/reinitialiser-otp` | admin | Regen OTP + email |
| GET | `/api/audit` | admin | List audit logs |
| GET | `/api/audit/:id` | admin | Get audit log |
| GET | `/api/audit/meta/modules` | admin | Available modules |
| GET | `/api/audit/meta/actions` | admin | Available actions |

## Environment Variables (`.env` in `packages/server/`)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sicot
JWT_ACCESS_SECRET=<random-256bit>
JWT_REFRESH_SECRET=<random-256bit>
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@anac.ga
SMTP_PASS=<password>
UPLOAD_DIR=/sicot/documents
MAX_LOGIN_ATTEMPTS=5
```

## ANAC Color Tokens Quick Reference

```
bg-anac-navy      #1B2A5E   Primary, headers, sidebar
bg-anac-blue      #2B4DAE   Hover
bg-anac-sky       #4A90D9   Focus ring, links
bg-anac-gray      #F4F6FA   Page background
bg-anac-border    #D1D9E6   Borders, dividers
text-anac-text    #1A2340   Body text
text-anac-muted   #6B7A99   Secondary text
bg-anac-success   #16A34A   Success / active
bg-anac-warning   #D97706   Warnings
bg-anac-danger    #DC2626   Errors, destructive
bg-anac-info      #0891B2   Info states
```

## User Roles Hierarchy

```
agent < traducteur < relecteur < admin < super_admin
```

| Role | Access |
|------|--------|
| `agent` | Own demandes, documents (view) |
| `traducteur` | Agent + traductions assigned to them |
| `relecteur` | Traducteur + approve translations |
| `admin` | All modules, user management |
| `super_admin` | Admin + system config |

## Common Imports (Client)

```typescript
// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Utilities
import { cn } from '@/lib/utils';

// API
import { authApi } from '@/lib/auth.api';
import { usersApi } from '@/lib/users.api';
import api from '@/lib/axios';          // raw Axios instance

// Auth context
import { useAuth } from '@/App';        // { user, setUser, chargement }

// Forms
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Routing
import { useNavigate } from 'react-router-dom';

// Animations
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';

// Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

## Adding a New Module (Checklist)

### Server
- [ ] Create `packages/server/src/modules/<name>/`
  - [ ] `services/<name>.service.ts` — business logic
  - [ ] `controllers/<name>.controller.ts` — HTTP handlers
  - [ ] `routes/<name>.route.ts` — Express Router + middleware
- [ ] Import route in `src/index.ts` and mount with `app.use('/api/<name>', route)`
- [ ] Add audit log calls to mutating service methods

### Client
- [ ] Create `packages/client/src/lib/<name>.api.ts`
- [ ] Export from `packages/client/src/lib/api.ts` barrel
- [ ] Create page in `packages/client/src/pages/`
- [ ] Add route in `App.tsx` (uncomment or add new `<Route>`)
- [ ] Add nav item to `components/layouts/Layout.tsx`
