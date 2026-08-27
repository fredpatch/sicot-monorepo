import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import auditRouter from './audit.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP; only JWT verification and the controller layer are mocked.
// The router-level guard applies uniformly to reads AND exports — this
// file explicitly verifies exports share the exact same boundary as
// normal reads, not a separately (and possibly weaker) gated path.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/audit.controller', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getById: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getModules: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getActions: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  exporterPDF: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  exporterExcel: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use('/audit', auditRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NO_VIEW_ROLES = ['agent', 'operateur'];
const VIEW_ROLES = ['admin', 'super_admin'];

describe('audit.route — every route (reads AND exports) requires AUDIT_VIEW (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/audit').expect(401);
  });

  it.each(NO_VIEW_ROLES)('403s role=%s on reads and exports alike (no AUDIT_VIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/audit').set('Cookie', cookie).expect(403);
    await request(app).get('/audit/1').set('Cookie', cookie).expect(403);
    await request(app).get('/audit/meta/modules').set('Cookie', cookie).expect(403);
    await request(app).get('/audit/meta/actions').set('Cookie', cookie).expect(403);
    await request(app).get('/audit/export/pdf').set('Cookie', cookie).expect(403);
    await request(app).get('/audit/export/excel').set('Cookie', cookie).expect(403);
  });

  it.each(VIEW_ROLES)('allows role=%s on reads and exports alike (has AUDIT_VIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/audit').set('Cookie', cookie).expect(200);
    await request(app).get('/audit/1').set('Cookie', cookie).expect(200);
    await request(app).get('/audit/meta/modules').set('Cookie', cookie).expect(200);
    await request(app).get('/audit/meta/actions').set('Cookie', cookie).expect(200);
    await request(app).get('/audit/export/pdf').set('Cookie', cookie).expect(200);
    await request(app).get('/audit/export/excel').set('Cookie', cookie).expect(200);
  });
});
