import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import accordsRouter from './accords.route';

// Direct-API security tests (prompt.md §37): exercise the real Express
// router + real authenticate/requireCapability middleware end to end, over
// HTTP, for every role — not just the UI's happy path. Only two things are
// mocked: JWT verification (so we don't need real signing keys) and the
// controller layer (so this needs no database). Everything else — cookie
// parsing, authenticate(), requireCapability(), route wiring — is real.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/accords.controller.js', () => ({
  expirantBientot: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getById: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  exporterPDF: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  creer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
  mettreAJour: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  renouveler: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/accords', accordsRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

describe('accords.route — write routes require AGREEMENT_MANAGE', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).post('/accords').send({}).expect(401);
  });

  it.each(['agent', 'operateur'])(
    '403s role=%s on create/update/renew (no AGREEMENT_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/accords').set('Cookie', cookie).send({}).expect(403);
      await request(app).patch('/accords/1').set('Cookie', cookie).send({}).expect(403);
      await request(app).post('/accords/1/renouveler').set('Cookie', cookie).send({}).expect(403);
    }
  );

  it.each(['admin', 'super_admin'])(
    'allows role=%s on create/update/renew (has AGREEMENT_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/accords').set('Cookie', cookie).send({}).expect(201);
      await request(app).patch('/accords/1').set('Cookie', cookie).send({}).expect(200);
      await request(app).post('/accords/1/renouveler').set('Cookie', cookie).send({}).expect(200);
    }
  );
});

describe('accords.route — read routes unchanged (open to any authenticated role)', () => {
  it.each(['agent', 'operateur', 'admin', 'super_admin'])('role=%s can list and read', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/accords').set('Cookie', cookie).expect(200);
    await request(app).get('/accords/1').set('Cookie', cookie).expect(200);
    await request(app).get('/accords/expirant').set('Cookie', cookie).expect(200);
  });

  it('401s unauthenticated reads too', async () => {
    const app = buildApp();
    await request(app).get('/accords').expect(401);
  });
});
