import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import morgan from 'morgan';
import {
  createGlobalLimiter,
  createLoginLimiter,
  createPortalListLimiter,
  createPortalTokenLimiter,
  createPortalViewLimiter,
  RATE_LIMIT_CODE,
} from './rateLimiters';

// Every test below constructs its own limiter instance via a factory (low
// `max` override, real production windowMs left untouched) and its own
// Express app - express-rate-limit gives each instance an independent
// in-memory store, so there is no shared state and no dependency on test
// ordering. Production numbers (index.ts, auth.route.ts, portal.route.ts)
// are never touched here.

function appWithLimiter(limiter: express.RequestHandler) {
  const app = express();
  app.use('/api', limiter);
  app.get('/api/test', (_req, res) => res.status(200).json({ ok: true }));
  app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  return app;
}

describe('rateLimiters - 429 JSON contract', () => {
  it('returns {message, code: TROP_DE_REQUETES} with Retry-After/RateLimit headers once exceeded', async () => {
    const app = appWithLimiter(createLoginLimiter({ max: 2 }));

    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(200);
    const res = await request(app).get('/api/test').expect(429);

    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({
      message: expect.any(String),
      code: RATE_LIMIT_CODE,
    });
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    // legacyHeaders: false - the old X-RateLimit-* headers must not appear
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('requests under the threshold reach the handler normally', async () => {
    const app = appWithLimiter(createLoginLimiter({ max: 5 }));
    const res = await request(app).get('/api/test').expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('rateLimiters - isolation between limiter instances', () => {
  it('two independently constructed limiters never share counters, even with identical config', async () => {
    const appA = appWithLimiter(createLoginLimiter({ max: 1 }));
    const appB = appWithLimiter(createLoginLimiter({ max: 1 }));

    await request(appA).get('/api/test').expect(200);
    await request(appA).get('/api/test').expect(429); // A's own store is now exhausted

    // B has its own store - unaffected by A's traffic despite identical config
    await request(appB).get('/api/test').expect(200);
  });
});

describe('createGlobalLimiter - /api/health exclusion', () => {
  it('never rate-limits /api/health even after the threshold is exhausted on other /api paths', async () => {
    const app = appWithLimiter(createGlobalLimiter({ max: 1 }));

    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(429);

    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/health').expect(200);
  });
});

describe('createGlobalLimiter - Morgan middleware order (index.ts invariant)', () => {
  it('a request rejected by the global limiter still reaches the request logger, mounted before it', async () => {
    // Mirrors the corrected middleware order in index.ts: Morgan MUST run
    // before the global limiter, so a 429 is still visible in the access
    // log (the approved logging model - no audit_logs write per 429).
    const lines: string[] = [];
    const stream = { write: (line: string) => lines.push(line) };

    const app = express();
    app.use(morgan('combined', { stream }));
    app.use('/api', createGlobalLimiter({ max: 1 }));
    app.get('/api/test', (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/api/test').expect(200);
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(429);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain(' 200 ');
    expect(lines[1]).toContain(' 429 ');
  });

  it('sanity check: if the limiter were mounted before Morgan, the rejected request would NOT reach the logger', async () => {
    // Documents the bug this order guards against - kept as a negative
    // control so a future regression (limiter moved back before Morgan)
    // would be caught by the previous test failing, not silently.
    const lines: string[] = [];
    const stream = { write: (line: string) => lines.push(line) };

    const app = express();
    app.use('/api', createGlobalLimiter({ max: 1 })); // wrong order, deliberately
    app.use(morgan('combined', { stream }));
    app.get('/api/test', (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(429);

    // Only the one request that got past the limiter was logged.
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(' 200 ');
  });
});

describe.each([
  ['createPortalListLimiter', createPortalListLimiter],
  ['createPortalTokenLimiter', createPortalTokenLimiter],
  ['createPortalViewLimiter', createPortalViewLimiter],
] as const)('%s', (_name, factory) => {
  it('allows requests up to max, then returns 429', async () => {
    const app = appWithLimiter(factory({ max: 3 }));

    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(200);
    const res = await request(app).get('/api/test').expect(429);
    expect(res.body.code).toBe(RATE_LIMIT_CODE);
  });
});
