import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import analyticsRouter from './analytics.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP; only JWT verification and the controller layers are mocked.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/analytics.controller', () => ({
  accords: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  courriers: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  missions: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  traduction: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  demandes: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  documents: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  glossaire: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  global: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  exporterAnalytics: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
  statutGemini: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
}));

vi.mock('@/modules/report/controllers/rapports.controller', () => ({
  genererRapport: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ ok: true }),
  listerRapports: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
  genererAnalyseIA: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ ok: true }),
  getRapportDetail: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
  validerAnalyseIA: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/analytics', analyticsRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NO_VIEW_ROLES = ['agent', 'operateur'];
const VIEW_ROLES = ['admin', 'super_admin'];

describe('analytics.route - all module/rapports routes require ANALYTICS_VIEW (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/analytics/global').expect(401);
  });

  it.each(NO_VIEW_ROLES)(
    '403s role=%s on every analytics/rapports route (no ANALYTICS_VIEW)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).get('/analytics/accords').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/courriers').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/missions').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/traductions').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/demandes').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/documents').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/glossaire').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/global').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/export').set('Cookie', cookie).expect(403);
      await request(app).post('/analytics/rapports').set('Cookie', cookie).send({}).expect(403);
      await request(app).get('/analytics/rapports').set('Cookie', cookie).expect(403);
      await request(app).get('/analytics/rapports/1').set('Cookie', cookie).expect(403);
      await request(app).post('/analytics/rapports/1/analyse-ia').set('Cookie', cookie).expect(403);
      await request(app)
        .patch('/analytics/rapports/1/analyse-ia')
        .set('Cookie', cookie)
        .expect(403);
      await request(app).get('/analytics/gemini-usage').set('Cookie', cookie).expect(403);
    }
  );

  it.each(VIEW_ROLES)(
    'allows role=%s on every analytics/rapports route (has ANALYTICS_VIEW + ADMIN_MONITORING_VIEW)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).get('/analytics/global').set('Cookie', cookie).expect(200);
      await request(app).get('/analytics/export').set('Cookie', cookie).expect(200);
      await request(app).post('/analytics/rapports').set('Cookie', cookie).send({}).expect(201);
      await request(app).get('/analytics/rapports/1').set('Cookie', cookie).expect(200);
      await request(app).post('/analytics/rapports/1/analyse-ia').set('Cookie', cookie).expect(201);
      await request(app)
        .patch('/analytics/rapports/1/analyse-ia')
        .set('Cookie', cookie)
        .expect(200);
      await request(app).get('/analytics/gemini-usage').set('Cookie', cookie).expect(200);
    }
  );
});
