import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { RATE_LIMIT_CODE } from '@/middleware/rateLimiters';

// Same pattern as audit.route.test.ts / portal.route.test.ts: real router +
// real middleware (including the real, production-configured login
// limiter), only JWT verification and the controller layer are mocked.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/auth.controller', () => ({
  login: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  refresh: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  setPassword: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  changerMotDePasse: (_req: express.Request, res: express.Response) =>
    res.status(200).json({ ok: true }),
  logout: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  me: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

// The login limiter is created once, at module scope, in auth.route.ts -
// exactly like production. To keep each test's limiter store isolated
// (no shared state, no ordering dependency) each test resets the module
// registry and re-imports the router fresh, giving it its own store,
// still built from the real production factory default (max 30/15min) -
// not a weakened test-only threshold.
async function buildApp() {
  vi.resetModules();
  const { default: authRouter } = await import('./auth.route');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('auth.route - login limiter', () => {
  it('POST /login 429s once its production threshold (30/15min) is exceeded, with the JSON contract', async () => {
    const app = await buildApp();

    for (let i = 0; i < 30; i++) {
      await request(app).post('/auth/login').send({ matricule: 'X0001' }).expect(200);
    }

    const res = await request(app).post('/auth/login').send({ matricule: 'X0001' });
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ message: expect.any(String), code: RATE_LIMIT_CODE });
    expect(res.headers['retry-after']).toBeDefined();
  }, 20000);

  it('POST /refresh does not share the login limiter bucket - stays usable after /login is exhausted', async () => {
    const app = await buildApp();

    for (let i = 0; i < 30; i++) {
      await request(app).post('/auth/login').send({ matricule: 'X0001' }).expect(200);
    }
    await request(app).post('/auth/login').send({ matricule: 'X0001' }).expect(429);

    // /refresh carries no limiter at all - entirely unaffected by /login's state
    await request(app).post('/auth/refresh').expect(200);
    await request(app).post('/auth/refresh').expect(200);
  }, 20000);
});
