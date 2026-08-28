import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import demandesRouter from './demandes.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP. lister/aggregates/getById run for real (they carry the
// ownership-scoping fix under test); everything else is stubbed. Only the
// service layer is mocked, so no database is needed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

const listerDemandes = vi.fn().mockResolvedValue({ data: [], total: 0 });
const getDemandesAggregates = vi.fn().mockResolvedValue({ total: 0 });
const getDemande = vi.fn();

vi.mock('../services/demandes.service.js', () => ({
  listerDemandes: (...args: unknown[]) => listerDemandes(...args),
  getDemandesAggregates: (...args: unknown[]) => getDemandesAggregates(...args),
  getDemande: (...args: unknown[]) => getDemande(...args),
}));

vi.mock('../controllers/demandes.controller.js', async () => {
  const actual = await vi.importActual<typeof import('../controllers/demandes.controller')>(
    '../controllers/demandes.controller'
  );
  return {
    ...actual,
    // real lister/aggregates/getById (to exercise the ownership fix), everything else stubbed
    creer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
    prendreEnCharge: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    rappeler: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    validerPriorite: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    passerEnRelecture: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    valider: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    archiver: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  };
});

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/demandes', demandesRouter);
  return app;
}

function cookieFor(role: string, userId = 1) {
  const token = JSON.stringify({ userId, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const PERSONAL_ONLY_ROLES = ['agent'];
const QUEUE_ROLES = ['operateur', 'admin', 'super_admin'];
const NO_TAKE_ROLES = ['agent'];
const TAKE_ROLES = ['operateur', 'admin', 'super_admin'];

describe('demandes.route - creation/recall are personal capabilities, open to every role', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).post('/demandes').send({}).expect(401);
  });

  it.each([...PERSONAL_ONLY_ROLES, ...QUEUE_ROLES])(
    'role=%s can create and recall their own request (REQUEST_CREATE_OWN / REQUEST_RECALL_OWN)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/demandes').set('Cookie', cookie).send({}).expect(201);
      await request(app).patch('/demandes/1/rappeler').set('Cookie', cookie).expect(200);
    }
  );
});

describe('demandes.route - take/submit-review require REQUEST_TAKE / REQUEST_SUBMIT_REVIEW (operateur+)', () => {
  it.each(NO_TAKE_ROLES)('403s role=%s (no REQUEST_TAKE/REQUEST_SUBMIT_REVIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).patch('/demandes/1/prendre-en-charge').set('Cookie', cookie).expect(403);
    await request(app).patch('/demandes/1/relecture').set('Cookie', cookie).expect(403);
  });

  it.each(TAKE_ROLES)('allows role=%s (has REQUEST_TAKE/REQUEST_SUBMIT_REVIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).patch('/demandes/1/prendre-en-charge').set('Cookie', cookie).expect(200);
    await request(app).patch('/demandes/1/relecture').set('Cookie', cookie).expect(200);
  });
});

describe('demandes.route - priority/valider/archiver require REQUEST_PRIORITY_VALIDATE / REQUEST_VALIDATE / REQUEST_ARCHIVE', () => {
  it.each(NO_TAKE_ROLES)('403s role=%s on priority/valider/archiver', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app)
      .patch('/demandes/1/priorite')
      .set('Cookie', cookie)
      .send({ priorite: 'urgente' })
      .expect(403);
    await request(app).patch('/demandes/1/valider').set('Cookie', cookie).expect(403);
    await request(app).patch('/demandes/1/archiver').set('Cookie', cookie).expect(403);
  });

  it.each(TAKE_ROLES)('allows role=%s on priority/valider/archiver', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app)
      .patch('/demandes/1/priorite')
      .set('Cookie', cookie)
      .send({ priorite: 'urgente' })
      .expect(200);
    await request(app).patch('/demandes/1/valider').set('Cookie', cookie).expect(200);
    await request(app).patch('/demandes/1/archiver').set('Cookie', cookie).expect(200);
  });
});

describe('demandes.route - personal scoping decoupled from role === agent (GET /, /aggregates, /:id)', () => {
  beforeEach(() => {
    listerDemandes.mockClear();
    getDemandesAggregates.mockClear();
    getDemande.mockReset();
  });

  it('agent sees only their own personal requests - client-supplied demandeurId is ignored', async () => {
    const app = buildApp();
    await request(app)
      .get('/demandes')
      .query({ demandeurId: '999' })
      .set('Cookie', cookieFor('agent', 42))
      .expect(200);
    expect(listerDemandes).toHaveBeenCalledWith(expect.objectContaining({ demandeurId: 42 }));
  });

  it.each(QUEUE_ROLES)(
    'role=%s (REQUEST_QUEUE_VIEW) can still use their own personal request view',
    async (role) => {
      const app = buildApp();
      await request(app)
        .get('/demandes')
        .query({ demandeurId: '42' })
        .set('Cookie', cookieFor(role, 42))
        .expect(200);
      expect(listerDemandes).toHaveBeenCalledWith(expect.objectContaining({ demandeurId: 42 }));
    }
  );

  it('operator queue access remains global - no demandeurId means unfiltered for REQUEST_QUEUE_VIEW roles', async () => {
    const app = buildApp();
    await request(app).get('/demandes').set('Cookie', cookieFor('operateur', 42)).expect(200);
    expect(listerDemandes).toHaveBeenCalledWith(
      expect.objectContaining({ demandeurId: undefined })
    );
  });

  it('aggregates: agent forced to own id regardless of query param', async () => {
    const app = buildApp();
    await request(app)
      .get('/demandes/aggregates')
      .query({ demandeurId: '999' })
      .set('Cookie', cookieFor('agent', 42))
      .expect(200);
    expect(getDemandesAggregates).toHaveBeenCalledWith(42);
  });

  it("getById: another user cannot access someone else's personal request", async () => {
    getDemande.mockResolvedValue({ id: 7, demandeurId: 99 });
    const app = buildApp();
    // agent 42 tries to fetch a demande belonging to user 99
    await request(app).get('/demandes/7').set('Cookie', cookieFor('agent', 42)).expect(403); // DEMANDE_NON_AUTORISEE
  });

  it('getById: the owning agent can access their own request', async () => {
    getDemande.mockResolvedValue({ id: 7, demandeurId: 42 });
    const app = buildApp();
    await request(app).get('/demandes/7').set('Cookie', cookieFor('agent', 42)).expect(200);
  });

  it('getById: a REQUEST_QUEUE_VIEW role can access any request by id', async () => {
    getDemande.mockResolvedValue({ id: 7, demandeurId: 99 });
    const app = buildApp();
    await request(app).get('/demandes/7').set('Cookie', cookieFor('admin', 1)).expect(200);
  });
});

describe('demandes.route - direct API access denied when capability missing (401/403 matrix)', () => {
  it('401s every write route when unauthenticated', async () => {
    const app = buildApp();
    await request(app).patch('/demandes/1/prendre-en-charge').expect(401);
    await request(app).patch('/demandes/1/relecture').expect(401);
    await request(app).patch('/demandes/1/priorite').send({ priorite: 'urgente' }).expect(401);
    await request(app).patch('/demandes/1/valider').expect(401);
    await request(app).patch('/demandes/1/archiver').expect(401);
    await request(app).patch('/demandes/1/rappeler').expect(401);
  });

  it('401s reads when unauthenticated too', async () => {
    const app = buildApp();
    await request(app).get('/demandes').expect(401);
    await request(app).get('/demandes/aggregates').expect(401);
    await request(app).get('/demandes/1').expect(401);
  });
});
