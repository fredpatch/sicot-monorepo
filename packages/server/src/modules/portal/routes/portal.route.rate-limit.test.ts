import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { RATE_LIMIT_CODE } from '@/middleware/rateLimiters';

// Separate file from portal.route.test.ts (which only sends a handful of
// requests per test, well under any threshold) so that deliberately
// exhausting a limiter's production threshold here can never bleed into
// - or depend on the order of - the authorization tests in that file.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/portal.controller', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  aggregates: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  getDocument: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  consulter: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  genererToken: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
  telecharger: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  toggleVisibilite: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
}));

// The three portal limiters are created once, at module scope, in
// portal.route.ts. Each test resets the module registry and re-imports the
// router fresh so it gets its own independent stores - no shared state, no
// ordering dependency - while still exercising the real production
// thresholds (120 / 10 / 60 per 15min), not weakened test-only values.
async function buildApp() {
  vi.resetModules();
  const { default: portalRouter } = await import('./portal.route');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/portal', portalRouter);
  return app;
}

function expectRateLimitBody(res: request.Response) {
  expect(res.body).toEqual({ message: expect.any(String), code: RATE_LIMIT_CODE });
  expect(res.headers['retry-after']).toBeDefined();
  expect(res.headers['ratelimit-limit']).toBeDefined();
}

describe('portal.route - listing limiter (120/15min)', () => {
  it('GET /documents 429s once the threshold is exceeded', async () => {
    const app = await buildApp();

    for (let i = 0; i < 120; i++) {
      await request(app).get('/portal/documents').expect(200);
    }
    const res = await request(app).get('/portal/documents');
    expect(res.status).toBe(429);
    expectRateLimitBody(res);
  }, 30000);

  it('GET /documents/aggregates shares the same listing limiter bucket as /documents', async () => {
    const app = await buildApp();

    for (let i = 0; i < 120; i++) {
      await request(app).get('/portal/documents').expect(200);
    }
    // Same listeLimiter instance backs both routes by design (§5 of the
    // Phase 12.4 audit) - aggregates should already be exhausted too.
    await request(app).get('/portal/documents/aggregates').expect(429);
  }, 30000);
});

describe('portal.route - token issuance limiter (10/15min)', () => {
  it('POST /documents/:id/token 429s once the threshold is exceeded', async () => {
    const app = await buildApp();

    for (let i = 0; i < 10; i++) {
      await request(app).post('/portal/documents/1/token').send({}).expect(200);
    }
    const res = await request(app).post('/portal/documents/1/token').send({});
    expect(res.status).toBe(429);
    expectRateLimitBody(res);
  }, 15000);
});

describe('portal.route - view/download limiter (60/15min)', () => {
  it('GET /documents/:id 429s once the threshold is exceeded', async () => {
    const app = await buildApp();

    for (let i = 0; i < 60; i++) {
      await request(app).get('/portal/documents/1').expect(200);
    }
    const res = await request(app).get('/portal/documents/1');
    expect(res.status).toBe(429);
    expectRateLimitBody(res);
  }, 20000);

  it('GET /documents/:id/consulter and GET /telecharger/:token share the same view limiter bucket', async () => {
    const app = await buildApp();

    for (let i = 0; i < 60; i++) {
      await request(app).get('/portal/documents/1/consulter').expect(200);
    }
    await request(app).get('/portal/documents/1/consulter').expect(429);
    await request(app).get('/portal/telecharger/sometoken').expect(429);
  }, 20000);
});
