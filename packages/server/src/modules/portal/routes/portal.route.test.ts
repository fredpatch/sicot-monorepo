import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import portalRouter from './portal.route';

// Phase 4.7 explicitly requires verifying the public portal stays
// unaffected by this authorization refactor. Only the one admin route
// (visibilite) sits behind authenticate/requireCapability — every other
// route here must keep working with zero auth cookie at all.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/portal.controller', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  aggregates: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getDocument: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  consulter: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  genererToken: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  telecharger: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  toggleVisibilite: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/portal', portalRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

describe('portal.route — public routes remain completely unaffected (no auth required)', () => {
  it('public read/token/download routes work with zero auth cookie', async () => {
    const app = buildApp();
    await request(app).get('/portal/documents/aggregates').expect(200);
    await request(app).get('/portal/documents').expect(200);
    await request(app).get('/portal/documents/1').expect(200);
    await request(app).get('/portal/documents/1/consulter').expect(200);
    await request(app).post('/portal/documents/1/token').send({}).expect(200);
    await request(app).get('/portal/telecharger/sometoken').expect(200);
  });
});

describe('portal.route — publication management requires PORTAL_PUBLICATION_MANAGE (admin+)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).patch('/portal/documents/1/visibilite').send({}).expect(401);
  });

  it.each(['agent', 'operateur'])(
    '403s role=%s (no PORTAL_PUBLICATION_MANAGE)',
    async (role) => {
      const app = buildApp();
      await request(app)
        .patch('/portal/documents/1/visibilite')
        .set('Cookie', cookieFor(role))
        .send({})
        .expect(403);
    }
  );

  it.each(['admin', 'super_admin'])('allows role=%s (has PORTAL_PUBLICATION_MANAGE)', async (role) => {
    const app = buildApp();
    await request(app)
      .patch('/portal/documents/1/visibilite')
      .set('Cookie', cookieFor(role))
      .send({})
      .expect(200);
  });
});
