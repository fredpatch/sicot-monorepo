import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import contactsRouter from './contacts.route';

// Migrated from the legacy requireRole('agent') to requireCapability
// ('USER_DIRECTORY_VIEW') in Phase 7.2 (requiredRole.ts had zero remaining
// importers afterward and was deleted). Read-only (contact selector for the
// Missions module) — USER_DIRECTORY_VIEW is a personal capability present
// at every tier, so this preserves the exact same "any authenticated role"
// behavior as before; this test pins that down as a regression check.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../controllers/contacts.controller', () => ({
  lister: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use('/contacts', contactsRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

describe('contacts.route — unchanged (still open to any authenticated role)', () => {
  it.each(['agent', 'operateur', 'admin', 'super_admin'])(
    'role=%s can list contacts',
    async (role) => {
      const app = buildApp();
      await request(app).get('/contacts').set('Cookie', cookieFor(role)).expect(200);
    }
  );

  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/contacts').expect(401);
  });
});
