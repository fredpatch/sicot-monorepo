import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import missionsRouter from './missions.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as
// accords/organisations: real router + real authenticate/requireCapability
// middleware over HTTP. The controller layer is mocked EXCEPT lister/
// aggregates, which are the two functions carrying the participantId
// ownership fix - those run for real so resolveParticipantFilter() is
// actually exercised, with only missions.service mocked underneath them.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

const listerMissions = vi.fn().mockResolvedValue({ data: [], total: 0 });
const getMissionsAggregates = vi.fn().mockResolvedValue({ total: 0 });
const estResponsableRapportMission = vi.fn();
const mettreAJourMission = vi.fn().mockResolvedValue({ id: 1, rapportDocumentId: 5 });

vi.mock('../services/missions.service.js', () => ({
  listerMissions: (...args: unknown[]) => listerMissions(...args),
  getMissionsAggregates: (...args: unknown[]) => getMissionsAggregates(...args),
  estResponsableRapportMission: (...args: unknown[]) => estResponsableRapportMission(...args),
  mettreAJourMission: (...args: unknown[]) => mettreAJourMission(...args),
}));

vi.mock('../services/missions.export.service.js', () => ({
  genererPDFMission: vi.fn(),
}));

vi.mock('../controllers/missions.controller', async () => {
  const actual = await vi.importActual<typeof import('../controllers/missions.controller')>(
    '../controllers/missions.controller'
  );
  return {
    ...actual,
    // real lister/aggregates (to exercise resolveParticipantFilter), everything else stubbed
    recommandationsEnAttente: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    getById: (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true }),
    listerRecommandations: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    exporterPDF: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    creer: (_req: express.Request, res: express.Response) => res.status(201).json({ ok: true }),
    mettreAJour: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
    ajouterRecommandation: (_req: express.Request, res: express.Response) =>
      res.status(201).json({ ok: true }),
    mettreAJourRecommandation: (_req: express.Request, res: express.Response) =>
      res.status(200).json({ ok: true }),
  };
});

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/missions', missionsRouter);
  return app;
}

function cookieFor(role: string, userId = 1) {
  const token = JSON.stringify({ userId, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NON_MANAGE_ROLES = ['agent', 'operateur'];
const MANAGE_ROLES = ['admin', 'super_admin'];

describe('missions.route - global write operations require MISSION_MANAGE', () => {
  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).post('/missions').send({}).expect(401);
  });

  it.each(NON_MANAGE_ROLES)(
    '403s role=%s on mission create/update (no MISSION_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/missions').set('Cookie', cookie).send({}).expect(403);
      await request(app).patch('/missions/1').set('Cookie', cookie).send({}).expect(403);
    }
  );

  it.each(MANAGE_ROLES)(
    'allows role=%s on mission create/update (has MISSION_MANAGE)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).post('/missions').set('Cookie', cookie).send({}).expect(201);
      await request(app).patch('/missions/1').set('Cookie', cookie).send({}).expect(200);
    }
  );
});

describe('missions.route - recommendation management requires MISSION_RECOMMENDATION_MANAGE', () => {
  it.each(NON_MANAGE_ROLES)('403s role=%s on recommendation create/update', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app)
      .post('/missions/1/recommandations')
      .set('Cookie', cookie)
      .send({})
      .expect(403);
    await request(app)
      .patch('/missions/recommandations/1')
      .set('Cookie', cookie)
      .send({})
      .expect(403);
  });

  it.each(MANAGE_ROLES)('allows role=%s on recommendation create/update', async (role) => {
    const app = buildApp();
    const cookie = cookieFor(role);
    await request(app)
      .post('/missions/1/recommandations')
      .set('Cookie', cookie)
      .send({})
      .expect(201);
    await request(app)
      .patch('/missions/recommandations/1')
      .set('Cookie', cookie)
      .send({})
      .expect(200);
  });
});

describe('missions.route - read routes unchanged (open to any authenticated role)', () => {
  it.each([...NON_MANAGE_ROLES, ...MANAGE_ROLES])(
    'role=%s can read mission registry',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app).get('/missions').set('Cookie', cookie).expect(200);
      await request(app).get('/missions/1').set('Cookie', cookie).expect(200);
      await request(app).get('/missions/1/recommandations').set('Cookie', cookie).expect(200);
      await request(app)
        .get('/missions/recommandations/en-attente')
        .set('Cookie', cookie)
        .expect(200);
    }
  );

  it('401s unauthenticated reads too', async () => {
    const app = buildApp();
    await request(app).get('/missions').expect(401);
  });
});

describe('missions.route - participant IDOR fix (GET /missions, GET /missions/aggregates)', () => {
  beforeEach(() => {
    listerMissions.mockClear();
    getMissionsAggregates.mockClear();
  });

  it('unfiltered global read is unchanged for a non-registry role (no participantId sent to service)', async () => {
    const app = buildApp();
    await request(app).get('/missions').set('Cookie', cookieFor('agent', 42)).expect(200);
    expect(listerMissions).toHaveBeenCalledWith(
      expect.objectContaining({ participantId: undefined })
    );
  });

  it('a non-registry role requesting their own participantId gets their own id through unchanged', async () => {
    const app = buildApp();
    await request(app)
      .get('/missions')
      .query({ participantId: '42' })
      .set('Cookie', cookieFor('operateur', 42))
      .expect(200);
    expect(listerMissions).toHaveBeenCalledWith(expect.objectContaining({ participantId: 42 }));
  });

  it('a non-registry role tampering with participantId is forced back to their own identity (IDOR closed)', async () => {
    const app = buildApp();
    // user 42 tries to read user 99's "personal" missions by tampering with the query param
    await request(app)
      .get('/missions')
      .query({ participantId: '99' })
      .set('Cookie', cookieFor('agent', 42))
      .expect(200);
    expect(listerMissions).toHaveBeenCalledWith(expect.objectContaining({ participantId: 42 }));
    expect(listerMissions).not.toHaveBeenCalledWith(expect.objectContaining({ participantId: 99 }));
  });

  it('same tampering attempt via /missions/aggregates is also closed', async () => {
    const app = buildApp();
    await request(app)
      .get('/missions/aggregates')
      .query({ participantId: '99' })
      .set('Cookie', cookieFor('agent', 42))
      .expect(200);
    expect(getMissionsAggregates).toHaveBeenCalledWith(42);
  });

  it('admin (MISSION_REGISTRY_VIEW) may legitimately filter by another participantId', async () => {
    const app = buildApp();
    await request(app)
      .get('/missions')
      .query({ participantId: '99' })
      .set('Cookie', cookieFor('admin', 1))
      .expect(200);
    expect(listerMissions).toHaveBeenCalledWith(expect.objectContaining({ participantId: 99 }));
  });
});

// Phase 8 - PATCH /missions/:id/rapport runs the real controller (not
// stubbed above), so the contextual authorization
// (MISSION_MANAGE global OR MISSION_VIEW_OWN + estResponsableRapportMission)
// is actually exercised end to end; only missions.service is mocked.
describe('missions.route - PATCH /:id/rapport (personal report-submission workflow, Phase 8)', () => {
  beforeEach(() => {
    estResponsableRapportMission.mockReset();
    mettreAJourMission.mockClear();
  });

  it('401s an unauthenticated request', async () => {
    const app = buildApp();
    await request(app).patch('/missions/1/rapport').send({ documentId: 5 }).expect(401);
  });

  it('rejects a body with neither documentId nor null (400, not silently ignored)', async () => {
    const app = buildApp();
    await request(app)
      .patch('/missions/1/rapport')
      .set('Cookie', cookieFor('admin', 1))
      .send({})
      .expect(400);
    expect(mettreAJourMission).not.toHaveBeenCalled();
  });

  it('the designated responsible participant (agent, MISSION_VIEW_OWN) can submit the report', async () => {
    estResponsableRapportMission.mockResolvedValue(true);
    const app = buildApp();
    await request(app)
      .patch('/missions/1/rapport')
      .set('Cookie', cookieFor('agent', 42))
      .send({ documentId: 5 })
      .expect(200);
    expect(estResponsableRapportMission).toHaveBeenCalledWith(1, 42);
    expect(mettreAJourMission).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ rapportDocumentId: 5, updatedByUserId: 42 })
    );
  });

  it('another participant of the same mission (not designated responsible) cannot upload/replace it', async () => {
    estResponsableRapportMission.mockResolvedValue(false); // participant, but not THE responsible
    const app = buildApp();
    await request(app)
      .patch('/missions/1/rapport')
      .set('Cookie', cookieFor('agent', 99))
      .send({ documentId: 5 })
      .expect(403);
    expect(mettreAJourMission).not.toHaveBeenCalled();
  });

  it('an unrelated user (not even a participant) cannot upload', async () => {
    estResponsableRapportMission.mockResolvedValue(false);
    const app = buildApp();
    await request(app)
      .patch('/missions/1/rapport')
      .set('Cookie', cookieFor('operateur', 7))
      .send({ documentId: 5 })
      .expect(403);
    expect(mettreAJourMission).not.toHaveBeenCalled();
  });

  it('admin/super_admin (MISSION_MANAGE) can submit/replace without an ownership check', async () => {
    const app = buildApp();
    await request(app)
      .patch('/missions/1/rapport')
      .set('Cookie', cookieFor('admin', 1))
      .send({ documentId: 5 })
      .expect(200);
    expect(estResponsableRapportMission).not.toHaveBeenCalled();
  });

  it('the responsible participant can also clear the report (documentId: null)', async () => {
    estResponsableRapportMission.mockResolvedValue(true);
    const app = buildApp();
    await request(app)
      .patch('/missions/1/rapport')
      .set('Cookie', cookieFor('agent', 42))
      .send({ documentId: null })
      .expect(200);
    expect(mettreAJourMission).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ rapportDocumentId: null, updatedByUserId: 42 })
    );
  });
});
