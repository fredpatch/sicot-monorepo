import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  requireCapability,
  requireAnyCapability,
  requireAllCapabilities,
} from './requireCapability';

// Smallest isolated strategy: exercise the middleware function directly
// against hand-built req/res/next doubles. No Express app, no HTTP layer,
// no DB - requireCapability only reads req.user.role and calls
// hasCapability(), so nothing else needs to be real.
function mockReq(role: string | undefined): Request {
  return (role ? { user: { userId: 1, role } } : {}) as unknown as Request;
}

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireCapability', () => {
  it('returns 401 when unauthenticated', () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = vi.fn();

    requireCapability('USER_MANAGE')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated but lacking the capability', () => {
    const req = mockReq('agent');
    const res = mockRes();
    const next = vi.fn();

    requireCapability('AGREEMENT_MANAGE')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when authenticated and carrying the capability', () => {
    const req = mockReq('admin');
    const res = mockRes();
    const next = vi.fn();

    requireCapability('AGREEMENT_MANAGE')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies with 403, not a 500/throw, for an unrecognized role on req.user', () => {
    const req = mockReq('gestionnaire');
    const res = mockRes();
    const next = vi.fn();

    expect(() => requireCapability('REQUEST_VIEW_OWN')(req, res, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAnyCapability', () => {
  it('passes when at least one capability matches', () => {
    const res = mockRes();
    const next = vi.fn();

    requireAnyCapability('AGREEMENT_MANAGE', 'REQUEST_VIEW_OWN')(mockReq('agent'), res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('403s when none match', () => {
    const res = mockRes();
    const next = vi.fn();

    requireAnyCapability('AGREEMENT_MANAGE', 'USER_MANAGE')(mockReq('agent'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAllCapabilities', () => {
  it('passes only when every capability matches', () => {
    const res = mockRes();
    const next = vi.fn();

    requireAllCapabilities('USER_MANAGE', 'AUDIT_VIEW')(mockReq('admin'), res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('403s when one capability is missing', () => {
    const res = mockRes();
    const next = vi.fn();

    requireAllCapabilities('USER_MANAGE', 'SYSTEM_SETTINGS_MANAGE')(mockReq('admin'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
