import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import organisationsRouter from './organisations.route';

// Direct-API security tests (prompt.md §37), same pattern as
// accords.route.test.ts: real router + real authenticate/requireCapability
// middleware over HTTP; only JWT verification and the controller layer are
// mocked, so no database is needed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/organisations.controller.js', () => ({
  getPays: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getRegions: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getById: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  creer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
  mettreAJour: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  listerContacts: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  creerContact: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
  mettreAJourContact: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  definirPrincipal: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/organisations', organisationsRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NON_MANAGE_ROLES = ['agent', 'operateur'];
const MANAGE_ROLES = ['admin', 'super_admin'];

describe('organisations.route — write routes require PARTNER_MANAGE', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).post('/organisations').send({}).expect(401);
  });

  it.each(NON_MANAGE_ROLES)('403s role=%s on organisation create/update (no PARTNER_MANAGE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).post('/organisations').set('Cookie', cookie).send({}).expect(403);
    await request(app).patch('/organisations/1').set('Cookie', cookie).send({}).expect(403);
  });

  it.each(NON_MANAGE_ROLES)('403s role=%s on contact create/update/principal (no PARTNER_MANAGE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).post('/organisations/1/contacts').set('Cookie', cookie).send({}).expect(403);
    await request(app).patch('/organisations/contacts/1').set('Cookie', cookie).send({}).expect(403);
    await request(app)
      .patch('/organisations/contacts/1/principal')
      .set('Cookie', cookie)
      .send({})
      .expect(403);
  });

  it.each(MANAGE_ROLES)('allows role=%s on every write route (has PARTNER_MANAGE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).post('/organisations').set('Cookie', cookie).send({}).expect(201);
    await request(app).patch('/organisations/1').set('Cookie', cookie).send({}).expect(200);
    await request(app).post('/organisations/1/contacts').set('Cookie', cookie).send({}).expect(201);
    await request(app).patch('/organisations/contacts/1').set('Cookie', cookie).send({}).expect(200);
    await request(app)
      .patch('/organisations/contacts/1/principal')
      .set('Cookie', cookie)
      .send({})
      .expect(200);
  });
});

describe('organisations.route — read routes unchanged (open to any authenticated role)', () => {
  it.each([...NON_MANAGE_ROLES, ...MANAGE_ROLES])('role=%s can read organisations/contacts/meta', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/organisations').set('Cookie', cookie).expect(200);
    await request(app).get('/organisations/1').set('Cookie', cookie).expect(200);
    await request(app).get('/organisations/1/contacts').set('Cookie', cookie).expect(200);
    await request(app).get('/organisations/meta/pays').set('Cookie', cookie).expect(200);
    await request(app).get('/organisations/meta/regions').set('Cookie', cookie).expect(200);
  });

  it('401s unauthenticated reads too', async () => {
    const app = buildApp();
    await request(app).get('/organisations').expect(401);
  });
});
