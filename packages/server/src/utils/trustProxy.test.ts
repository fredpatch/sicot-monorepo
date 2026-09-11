import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { resolveTrustProxyHops, toExpressTrustProxySetting } from './trustProxy';

describe('resolveTrustProxyHops', () => {
  it('defaults to 0 (do not trust proxy) when unset', () => {
    expect(resolveTrustProxyHops(undefined)).toBe(0);
    expect(resolveTrustProxyHops('')).toBe(0);
    expect(resolveTrustProxyHops('   ')).toBe(0);
  });

  it('accepts a positive integer within the sane bound', () => {
    expect(resolveTrustProxyHops('1')).toBe(1);
    expect(resolveTrustProxyHops('2')).toBe(2);
    expect(resolveTrustProxyHops('10')).toBe(10);
  });

  it('accepts explicit "0"', () => {
    expect(resolveTrustProxyHops('0')).toBe(0);
  });

  it('rejects negative numbers and falls back to 0, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveTrustProxyHops('-1')).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rejects non-integers and falls back to 0', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveTrustProxyHops('1.5')).toBe(0);
    expect(resolveTrustProxyHops('abc')).toBe(0);
    warn.mockRestore();
  });

  it('rejects values above the sane bound and falls back to 0', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveTrustProxyHops('999')).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('toExpressTrustProxySetting', () => {
  it('maps 0 hops to false (Express trust-proxy disabled)', () => {
    expect(toExpressTrustProxySetting(0)).toBe(false);
  });

  it('maps a positive hop count to itself', () => {
    expect(toExpressTrustProxySetting(1)).toBe(1);
    expect(toExpressTrustProxySetting(3)).toBe(3);
  });
});

// req.ip behavior end-to-end, matching the documented nginx -> api topology
// (Phase 12.4 audit §8): a spoofed X-Forwarded-For must be ignored when
// trust proxy is disabled, and honored (for exactly one hop) when enabled.
describe('trust proxy setting - req.ip behavior over real HTTP requests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function appWithTrustProxy(setting: number | false) {
    const app = express();
    app.set('trust proxy', setting);
    app.get('/whoami', (req, res) => res.json({ ip: req.ip }));
    return app;
  }

  it('ignores a spoofed X-Forwarded-For when trust proxy is disabled (dev/no-Nginx topology)', async () => {
    const app = appWithTrustProxy(false);
    const res = await request(app).get('/whoami').set('X-Forwarded-For', '9.9.9.9').expect(200);
    expect(res.body.ip).not.toBe('9.9.9.9');
  });

  it('honors X-Forwarded-For for exactly one trusted hop (prod/staging Nginx topology)', async () => {
    const app = appWithTrustProxy(1);
    const res = await request(app).get('/whoami').set('X-Forwarded-For', '9.9.9.9').expect(200);
    expect(res.body.ip).toBe('9.9.9.9');
  });
});
