import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import personnelAnacRouter from './personnel-anac.route';

// Migrated from the legacy requireAdmin (requiredRole.ts) to
// requireCapability('USER_MANAGE') in Phase 7.2 (requiredRole.ts had zero
// remaining importers afterward and was deleted) — same effective
// admin+ boundary, now expressed as a capability tied to the actual
// consuming workflow (AdminUsersPage / CreateUserDialog personnel lookup).
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/personnel-anac.controller', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  rechercher: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getParMatricule: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use('/personnel-anac', personnelAnacRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NON_MANAGE_ROLES = ['agent', 'operateur'];

describe('personnel-anac.route — requires USER_MANAGE (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/personnel-anac').expect(401);
  });

  it.each(NON_MANAGE_ROLES)('403s role=%s on every route (no USER_MANAGE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/personnel-anac').set('Cookie', cookie).expect(403);
    await request(app).get('/personnel-anac/rechercher').set('Cookie', cookie).expect(403);
    await request(app).get('/personnel-anac/matricule/X0001').set('Cookie', cookie).expect(403);
  });

  it.each(['admin', 'super_admin'])('allows role=%s on every route (has USER_MANAGE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/personnel-anac').set('Cookie', cookie).expect(200);
    await request(app).get('/personnel-anac/rechercher').set('Cookie', cookie).expect(200);
    await request(app).get('/personnel-anac/matricule/X0001').set('Cookie', cookie).expect(200);
  });
});
