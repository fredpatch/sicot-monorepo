import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import traductionRouter from './traduction.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP. getById/archiver/approuver run for real — they carry the
// ownership decoupling, the workflow-state guard, and the multi-capability
// wiring under test. Everything else is stubbed. Only the service layers
// are mocked, so no database is needed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

const getTraduction = vi.fn();
const archiverTraduction = vi.fn();
const approuverTraduction = vi.fn().mockResolvedValue({ id: 1, statut: 'approuvee' });

vi.mock('../services/traduction.service.js', () => ({
  listerTraductions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getTraductionsAggregates: vi.fn().mockResolvedValue({ total: 0 }),
  verifierMoteur: vi.fn().mockResolvedValue({ ok: true }),
  getTraduction: (...args: unknown[]) => getTraduction(...args),
  archiverTraduction: (...args: unknown[]) => archiverTraduction(...args),
  approuverTraduction: (...args: unknown[]) => approuverTraduction(...args),
  lancerTraduction: vi.fn().mockResolvedValue({ id: 1 }),
  relancerTraduction: vi.fn().mockResolvedValue({ id: 1 }),
  sauvegarderCorrection: vi.fn().mockResolvedValue({ id: 1 }),
  supprimerTraduction: vi.fn().mockResolvedValue({ id: 1 }),
  restaurerTraduction: vi.fn().mockResolvedValue({ id: 1 }),
  getSuggestionsGlossaire: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/traduction.export.service.js', () => ({
  genererPDFTraduction: vi.fn(),
  genererDOCXTraduction: vi.fn(),
}));

const estDemandeurDeTraduction = vi.fn();
vi.mock('@/modules/demandes/services/demandes.service.js', () => ({
  estDemandeurDeTraduction: (...args: unknown[]) => estDemandeurDeTraduction(...args),
}));

vi.mock('../controllers/traduction.controller', async () => {
  const actual = await vi.importActual<typeof import('../controllers/traduction.controller')>(
    '../controllers/traduction.controller'
  );
  return {
    ...actual,
    // real getById/archiver/approuver (ownership + workflow-state + multi-capability), rest stubbed
    exporterPDF: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    exporterDOCX: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    lancer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
    relancer: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    sauvegarderCorrection: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    suggestions: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    supprimer: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    restaurer: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
  };
});

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/traductions', traductionRouter);
  return app;
}

function cookieFor(role: string, userId = 1) {
  const token = JSON.stringify({ userId, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NO_QUEUE_ROLES = ['agent'];
const QUEUE_ROLES = ['operateur', 'admin', 'super_admin'];

beforeEach(() => {
  getTraduction.mockReset();
  archiverTraduction.mockReset();
  approuverTraduction.mockReset().mockResolvedValue({ id: 1, statut: 'approuvee' });
  estDemandeurDeTraduction.mockReset();
});

describe('traduction.route — global registry (aggregates/list/suggestions) requires TRANSLATION_VIEW', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).get('/traductions').expect(401);
  });

  it.each(NO_QUEUE_ROLES)('403s role=%s on the global registry (no TRANSLATION_VIEW)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/traductions').set('Cookie', cookie).expect(403);
    await request(app).get('/traductions/aggregates').set('Cookie', cookie).expect(403);
    await request(app).get('/traductions/1/suggestions').set('Cookie', cookie).query({ texte: 'x' }).expect(403);
  });

  it.each(QUEUE_ROLES)('allows role=%s on the global registry (operational access preserved)', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).get('/traductions').set('Cookie', cookie).expect(200);
    await request(app).get('/traductions/aggregates').set('Cookie', cookie).expect(200);
    await request(app).get('/traductions/1/suggestions').set('Cookie', cookie).query({ texte: 'x' }).expect(200);
  });
});

describe('traduction.route — GET /:id: ownership derived from requester relationship, not role', () => {
  it("agent/requester can access the translation linked to their own request", async () => {
    getTraduction.mockResolvedValue({ id: 7, statut: 'a_reviser' });
    estDemandeurDeTraduction.mockResolvedValue(true);

    const app = buildApp();
    await request(app).get('/traductions/7').set('Cookie', cookieFor('agent', 42)).expect(200);
    expect(estDemandeurDeTraduction).toHaveBeenCalledWith(7, 42);
  });

  it("agent cannot access another requester's translation", async () => {
    getTraduction.mockResolvedValue({ id: 7, statut: 'a_reviser' });
    estDemandeurDeTraduction.mockResolvedValue(false); // not linked to this agent's own demande

    const app = buildApp();
    await request(app).get('/traductions/7').set('Cookie', cookieFor('agent', 42)).expect(403); // TRADUCTION_NON_AUTORISEE
  });

  it.each(QUEUE_ROLES)(
    'role=%s (TRANSLATION_VIEW) can access any translation without an ownership check',
    async (role) => {
      getTraduction.mockResolvedValue({ id: 7, statut: 'a_reviser' });

      const app = buildApp();
      await request(app).get('/traductions/7').set('Cookie', cookieFor(role, 1)).expect(200);
      expect(estDemandeurDeTraduction).not.toHaveBeenCalled();
    }
  );
});

describe('traduction.route — processing requires TRANSLATION_PROCESS', () => {
  it.each(NO_QUEUE_ROLES)('403s role=%s on launch/relaunch/correction/delete/restore', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).post('/traductions').set('Cookie', cookie).send({}).expect(403);
    await request(app).patch('/traductions/1/relancer').set('Cookie', cookie).expect(403);
    await request(app).patch('/traductions/1/correction').set('Cookie', cookie).send({}).expect(403);
    await request(app).delete('/traductions/1').set('Cookie', cookie).expect(403);
    await request(app).patch('/traductions/1/restaurer').set('Cookie', cookie).expect(403);
  });

  it.each(QUEUE_ROLES)('allows role=%s on launch/relaunch/correction/delete/restore', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).post('/traductions').set('Cookie', cookie).send({}).expect(201);
    await request(app).patch('/traductions/1/relancer').set('Cookie', cookie).expect(200);
    await request(app).patch('/traductions/1/correction').set('Cookie', cookie).send({}).expect(200);
    await request(app).delete('/traductions/1').set('Cookie', cookie).expect(200);
    await request(app).patch('/traductions/1/restaurer').set('Cookie', cookie).expect(200);
  });
});

describe('traduction.route — approve requires TRANSLATION_REVIEW + TRANSLATION_APPROVE, archive requires TRANSLATION_ARCHIVE', () => {
  it.each(NO_QUEUE_ROLES)('403s role=%s on approve/archive (no capability)', async (role) => {
    archiverTraduction.mockResolvedValue({ id: 1, statut: 'archivee' });
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app).patch('/traductions/1/approuver').set('Cookie', cookie).expect(403);
    await request(app).patch('/traductions/1/archiver').set('Cookie', cookie).expect(403);
  });

  it.each(QUEUE_ROLES)(
    'allows role=%s on approve/archive — self-request → self-process → self-review/approve stays allowed in V1',
    async (role) => {
      archiverTraduction.mockResolvedValue({ id: 1, statut: 'archivee' });
      const app = buildApp();
      const cookie = cookieFor(role, 1);
      await request(app).patch('/traductions/1/approuver').set('Cookie', cookie).expect(200);
      await request(app).patch('/traductions/1/archiver').set('Cookie', cookie).expect(200);
    }
  );

  it('workflow-state still blocks archiving an unapproved translation even with TRANSLATION_ARCHIVE present', async () => {
    archiverTraduction.mockRejectedValue(new Error('APPROBATION_REQUISE'));
    const app = buildApp();
    // admin has TRANSLATION_ARCHIVE, but the service enforces statut === 'approuvee'
    await request(app).patch('/traductions/1/archiver').set('Cookie', cookieFor('admin')).expect(400);
  });
});
