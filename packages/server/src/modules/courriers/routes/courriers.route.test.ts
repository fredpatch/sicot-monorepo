import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import courriersRouter from './courriers.route';

// Direct-API security tests (prompt.md §37), same pattern as
// accords/organisations/missions: real router + real
// authenticate/requireCapability middleware over HTTP; only JWT
// verification and the controller layer are mocked, so no database is
// needed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/courriers.controller.js', () => ({
  sansReponse: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  aggregates: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getById: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getFilCorrespondance: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
  exporterPDF: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  creer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
  mettreAJour: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  ajouterDocument: (_req: express.Request, res: express.Response) =>
    res.status(201).json({ ok: true }),
  retirerDocument: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/courriers', courriersRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NON_MANAGE_ROLES = ['agent', 'operateur'];
const MANAGE_ROLES = ['admin', 'super_admin'];

describe('courriers.route - write routes require CORRESPONDENCE_MANAGE', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).post('/courriers').send({}).expect(401);
  });

  it.each(NON_MANAGE_ROLES)(
    '403s role=%s on courrier create/update (no CORRESPONDENCE_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/courriers').set('Cookie', cookie).send({}).expect(403);
      await request(app).patch('/courriers/1').set('Cookie', cookie).send({}).expect(403);
    }
  );

  it.each(NON_MANAGE_ROLES)(
    '403s role=%s on document attach/detach (no CORRESPONDENCE_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/courriers/1/documents').set('Cookie', cookie).send({}).expect(403);
      await request(app).delete('/courriers/1/documents/1').set('Cookie', cookie).expect(403);
    }
  );

  it.each(MANAGE_ROLES)(
    'allows role=%s on every write route (has CORRESPONDENCE_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/courriers').set('Cookie', cookie).send({}).expect(201);
      await request(app).patch('/courriers/1').set('Cookie', cookie).send({}).expect(200);
      await request(app).post('/courriers/1/documents').set('Cookie', cookie).send({}).expect(201);
      await request(app).delete('/courriers/1/documents/1').set('Cookie', cookie).expect(200);
    }
  );
});

describe('courriers.route - read routes unchanged (open to any authenticated role)', () => {
  it.each([...NON_MANAGE_ROLES, ...MANAGE_ROLES])('role=%s can read courriers', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/courriers').set('Cookie', cookie).expect(200);
    await request(app).get('/courriers/1').set('Cookie', cookie).expect(200);
    await request(app).get('/courriers/1/fil').set('Cookie', cookie).expect(200);
    await request(app).get('/courriers/sans-reponse').set('Cookie', cookie).expect(200);
    await request(app).get('/courriers/aggregates').set('Cookie', cookie).expect(200);
  });

  it('401s unauthenticated reads too', async () => {
    const app = buildApp();
    await request(app).get('/courriers').expect(401);
  });
});
