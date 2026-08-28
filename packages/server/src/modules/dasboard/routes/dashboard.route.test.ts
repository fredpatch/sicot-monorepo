import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import dashboardRouter from './dashboard.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP; only JWT verification and the controller layer are mocked.
// Closes the gap found during Phase 5.1's frontend audit: this route had
// no authorization guard at all before this fix, only authenticate.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

const DASHBOARD_PAYLOAD = { kpi: { ok: true }, accordsExpirant: [] };

vi.mock('../controllers/dashboard.controller.js', () => ({
  getDashboard: (_req: express.Request, res: express.Response) =>
    res.status(200).json(DASHBOARD_PAYLOAD),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use('/dashboard', dashboardRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

describe('dashboard.route - requires ANALYTICS_VIEW (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/dashboard').expect(401);
  });

  it.each(['agent', 'operateur'])('403s role=%s (no ANALYTICS_VIEW)', async (role) => {
    const app = buildApp();
    await request(app).get('/dashboard').set('Cookie', cookieFor(role)).expect(403);
  });

  it.each(['admin', 'super_admin'])('allows role=%s (has ANALYTICS_VIEW)', async (role) => {
    const app = buildApp();
    const res = await request(app).get('/dashboard').set('Cookie', cookieFor(role)).expect(200);
    // Existing response behavior unchanged for allowed roles.
    expect(res.body).toEqual(DASHBOARD_PAYLOAD);
  });
});
