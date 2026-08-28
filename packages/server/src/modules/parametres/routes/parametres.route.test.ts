import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import parametresRouter from './parametres.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP; only JWT verification and the controller layer are mocked.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/parametres.controller.js', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getByCle: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  mettreAJour: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/parametres', parametresRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NO_VIEW_ROLES = ['agent', 'operateur'];
const VIEW_ROLES = ['admin', 'super_admin'];
const NO_MANAGE_ROLES = ['agent', 'operateur', 'admin'];

describe('parametres.route - reads require SYSTEM_SETTINGS_VIEW (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/parametres').expect(401);
  });

  it.each(NO_VIEW_ROLES)('403s role=%s on reads (no SYSTEM_SETTINGS_VIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/parametres').set('Cookie', cookie).expect(403);
    await request(app).get('/parametres/some_key').set('Cookie', cookie).expect(403);
  });

  it.each(VIEW_ROLES)('allows role=%s on reads (has SYSTEM_SETTINGS_VIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/parametres').set('Cookie', cookie).expect(200);
    await request(app).get('/parametres/some_key').set('Cookie', cookie).expect(200);
  });
});

describe('parametres.route - writes require SYSTEM_SETTINGS_MANAGE (super_admin ONLY - admin excluded)', () => {
  it.each(NO_MANAGE_ROLES)(
    '403s role=%s on write (no SYSTEM_SETTINGS_MANAGE, including plain admin)',
    async (role) => {
      const app = buildApp();
      await request(app)
        .patch('/parametres/some_key')
        .set('Cookie', cookieFor(role))
        .send({ valeur: 'x' })
        .expect(403);
    }
  );

  it('allows super_admin on write', async () => {
    const app = buildApp();
    await request(app)
      .patch('/parametres/some_key')
      .set('Cookie', cookieFor('super_admin'))
      .send({ valeur: 'x' })
      .expect(200);
  });
});
