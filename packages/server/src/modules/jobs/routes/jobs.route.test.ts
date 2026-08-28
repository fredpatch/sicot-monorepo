import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import jobsRouter from './jobs.route';

// Route-level 401/403/allowed for JOB_EXECUTE. Per-job SYSTEM_ADMIN_OPERATION
// restriction (the "does route access alone let you run a backup job"
// question) is deliberately tested separately, at the service layer, in
// jobs.service.test.ts - that's where the actual distinction lives, and the
// controller here is stubbed so no real job execution occurs.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/jobs.controller.js', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  historique: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  executer: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/jobs', jobsRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NO_JOB_ROLES = ['agent', 'operateur'];
const JOB_ROLES = ['admin', 'super_admin'];

describe('jobs.route - every route requires JOB_EXECUTE (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/jobs').expect(401);
  });

  it.each(NO_JOB_ROLES)('403s role=%s on every route (no JOB_EXECUTE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/jobs').set('Cookie', cookie).expect(403);
    await request(app).get('/jobs/historique').set('Cookie', cookie).expect(403);
    await request(app).post('/jobs/some_key/executer').set('Cookie', cookie).expect(403);
  });

  it.each(JOB_ROLES)('allows role=%s on every route (has JOB_EXECUTE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/jobs').set('Cookie', cookie).expect(200);
    await request(app).get('/jobs/historique').set('Cookie', cookie).expect(200);
    await request(app).post('/jobs/some_key/executer').set('Cookie', cookie).expect(200);
  });
});
