import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import usersRouter from './users.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP. creer/mettreAJour run for real - they carry the
// ROLES_ASSIGNABLES validation under test. Everything else is stubbed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

vi.mock('../services/users.service', () => ({
  listerUtilisateurs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getUsersAggregates: vi.fn().mockResolvedValue({ total: 0 }),
  getUtilisateur: vi.fn().mockResolvedValue({ id: 1 }),
  creerUtilisateur: vi.fn().mockResolvedValue({ user: { id: 1 }, emailEnvoye: true }),
  mettreAJourUtilisateur: vi.fn().mockResolvedValue({ id: 1 }),
  toggleActivation: vi.fn().mockResolvedValue({ id: 1 }),
  reinitialiserOTP: vi.fn().mockResolvedValue({ emailEnvoye: true }),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/users', usersRouter);
  return app;
}

function cookieFor(role: string, userId = 1) {
  const token = JSON.stringify({ userId, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NON_MANAGE_ROLES = ['agent', 'operateur'];
const MANAGE_ROLES = ['admin', 'super_admin'];
const VALID_USER_PAYLOAD = {
  matricule: 'X0002',
  nom: 'Doe',
  prenom: 'Jane',
  email: 'jane@anac.ga',
  role: 'agent',
};

describe('users.route - directory list requires USER_DIRECTORY_VIEW (personal capability, every role)', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/users').expect(401);
  });

  it.each([...NON_MANAGE_ROLES, ...MANAGE_ROLES])(
    'role=%s can use the directory list (participant selector)',
    async (role) => {
      const app = buildApp();
      await request(app).get('/users').set('Cookie', cookieFor(role)).expect(200);
    }
  );
});

describe('users.route - management actions require USER_MANAGE (agent and legacy roles denied)', () => {
  it.each(NON_MANAGE_ROLES)(
    '403s role=%s on every management route (no USER_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).get('/users/aggregates').set('Cookie', cookie).expect(403);
      await request(app).post('/users').set('Cookie', cookie).send(VALID_USER_PAYLOAD).expect(403);
      await request(app).get('/users/1').set('Cookie', cookie).expect(403);
      await request(app).patch('/users/1').set('Cookie', cookie).send({ actif: false }).expect(403);
      await request(app)
        .patch('/users/1/activation')
        .set('Cookie', cookie)
        .send({ actif: false })
        .expect(403);
      await request(app).post('/users/1/reinitialiser-otp').set('Cookie', cookie).expect(403);
    }
  );

  it.each(MANAGE_ROLES)(
    'allows role=%s on every management route (has USER_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role, 999); // distinct id so self-deactivation guard doesn't fire
      await request(app).get('/users/aggregates').set('Cookie', cookie).expect(200);
      await request(app).post('/users').set('Cookie', cookie).send(VALID_USER_PAYLOAD).expect(201);
      await request(app).get('/users/1').set('Cookie', cookie).expect(200);
      await request(app).patch('/users/1').set('Cookie', cookie).send({ actif: false }).expect(200);
      await request(app)
        .patch('/users/1/activation')
        .set('Cookie', cookie)
        .send({ actif: false })
        .expect(200);
      await request(app).post('/users/1/reinitialiser-otp').set('Cookie', cookie).expect(200);
    }
  );
});

describe('users.route - server-side role-assignment validation (final four-role model)', () => {
  it('POST / accepts role=operateur from an admin (Phase 6.1 - now exposed)', async () => {
    const app = buildApp();
    await request(app)
      .post('/users')
      .set('Cookie', cookieFor('admin', 999))
      .send({ ...VALID_USER_PAYLOAD, role: 'operateur' })
      .expect(201);
  });

  it('PATCH /:id rejects the removed legacy roles traducteur/relecteur', async () => {
    const app = buildApp();
    await request(app)
      .patch('/users/1')
      .set('Cookie', cookieFor('admin', 999))
      .send({ role: 'traducteur' })
      .expect(400);
    await request(app)
      .patch('/users/1')
      .set('Cookie', cookieFor('admin', 999))
      .send({ role: 'relecteur' })
      .expect(400);
  });

  it('PATCH /:id rejects an arbitrary invalid role string', async () => {
    const app = buildApp();
    await request(app)
      .patch('/users/1')
      .set('Cookie', cookieFor('admin', 999))
      .send({ role: 'not_a_real_role' })
      .expect(400);
  });

  it('PATCH /:id accepts a real target role from an admin', async () => {
    const app = buildApp();
    await request(app)
      .patch('/users/1')
      .set('Cookie', cookieFor('admin', 999))
      .send({ role: 'operateur' })
      .expect(200);
  });
});
