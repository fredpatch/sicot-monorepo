import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import glossaireRouter from './glossaire.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP; only JWT verification and the controller layer are mocked.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/glossaire.controller.js', () => ({
  aggregates: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  suggestions: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  importerCSV: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getById: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  creer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
  mettreAJour: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  desactiver: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  reactiver: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/glossaire', glossaireRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const AGENT = ['agent'];
const OPERATEUR_PLUS = ['operateur', 'admin', 'super_admin'];

describe('glossaire.route — all routes require at least GLOSSARY_VIEW; agent denied entirely', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/glossaire').expect(401);
  });

  it.each(AGENT)('403s role=%s on every glossary route (no glossary capability)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/glossaire').set('Cookie', cookie).expect(403);
    await request(app).get('/glossaire/1').set('Cookie', cookie).expect(403);
    await request(app).get('/glossaire/aggregates').set('Cookie', cookie).expect(403);
    await request(app).get('/glossaire/suggestions').set('Cookie', cookie).expect(403);
    await request(app).post('/glossaire').set('Cookie', cookie).send({}).expect(403);
    await request(app).patch('/glossaire/1').set('Cookie', cookie).send({}).expect(403);
    await request(app).patch('/glossaire/1/desactiver').set('Cookie', cookie).expect(403);
    await request(app).patch('/glossaire/1/reactiver').set('Cookie', cookie).expect(403);
    await request(app).post('/glossaire/import').set('Cookie', cookie).send({ termes: [] }).expect(403);
  });

  it.each(OPERATEUR_PLUS)('role=%s can read the glossary (GLOSSARY_VIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/glossaire').set('Cookie', cookie).expect(200);
    await request(app).get('/glossaire/1').set('Cookie', cookie).expect(200);
    await request(app).get('/glossaire/aggregates').set('Cookie', cookie).expect(200);
    await request(app).get('/glossaire/suggestions').set('Cookie', cookie).expect(200);
  });

  it.each(OPERATEUR_PLUS)('role=%s can manage the glossary (GLOSSARY_MANAGE)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).post('/glossaire').set('Cookie', cookie).send({}).expect(201);
    await request(app).patch('/glossaire/1').set('Cookie', cookie).send({}).expect(200);
    await request(app).patch('/glossaire/1/desactiver').set('Cookie', cookie).expect(200);
    await request(app).patch('/glossaire/1/reactiver').set('Cookie', cookie).expect(200);
    await request(app).post('/glossaire/import').set('Cookie', cookie).send({ termes: [] }).expect(200);
  });
});
