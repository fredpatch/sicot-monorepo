import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import notificationsRouter from './notifications.route';

// Phase 7.1 remediation tests. Previously historique/:type/:entiteId and
// envoyer had no per-entity authorization at all (any authenticated user,
// any entiteId — see prompt.md phase 7.1 audit). Real router + real
// authenticate/requireCapability middleware over HTTP; only the service
// layers (notifications.service, missions.service's estResponsableRecommandation)
// are mocked, so no database is needed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

const getHistoriqueEntite = vi.fn().mockResolvedValue([]);
const envoyerNotificationCiblee = vi.fn().mockResolvedValue({ id: 1, statut: 'envoyee' });
const getNotificationsRecentes = vi.fn().mockResolvedValue([]);

vi.mock('../services/notifications.service.js', () => ({
  getHistoriqueEntite: (...args: unknown[]) => getHistoriqueEntite(...args),
  envoyerNotificationCiblee: (...args: unknown[]) => envoyerNotificationCiblee(...args),
  getNotificationsRecentes: (...args: unknown[]) => getNotificationsRecentes(...args),
}));

const estResponsableRecommandation = vi.fn();
vi.mock('@/modules/missions/services/missions.service', () => ({
  estResponsableRecommandation: (...args: unknown[]) => estResponsableRecommandation(...args),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/notifications', notificationsRouter);
  return app;
}

function cookieFor(role: string, userId = 1) {
  const token = JSON.stringify({ userId, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const VALID_ENVOI = {
  entiteId: 7,
  destinataireEmail: 'dest@example.com',
  objet: 'Objet',
  message: 'Message',
};

beforeEach(() => {
  getHistoriqueEntite.mockClear();
  envoyerNotificationCiblee.mockClear();
  getNotificationsRecentes.mockClear();
  estResponsableRecommandation.mockReset();
});

describe('notifications.route — 401 unauthenticated', () => {
  it('401s every route family when unauthenticated', async () => {
    const app = buildApp();
    await request(app).get('/notifications/recentes').expect(401);
    await request(app).get('/notifications/historique/accord_echeance/1').expect(401);
    await request(app).post('/notifications/envoyer').send(VALID_ENVOI).expect(401);
  });
});

describe('notifications.route — GET /recentes requires ANALYTICS_VIEW (admin+)', () => {
  it('403s agent/operateur', async () => {
    const app = buildApp();
    await request(app).get('/notifications/recentes').set('Cookie', cookieFor('agent')).expect(403);
    await request(app).get('/notifications/recentes').set('Cookie', cookieFor('operateur')).expect(403);
  });

  it('allows admin', async () => {
    const app = buildApp();
    await request(app).get('/notifications/recentes').set('Cookie', cookieFor('admin')).expect(200);
  });
});

describe('notifications.route — GET /historique: accord_echeance/courrier_relance are admin+ only (no personal owner in the data model)', () => {
  it('403s agent/operateur for accord_echeance and courrier_relance regardless of entiteId', async () => {
    const app = buildApp();
    const cookie = cookieFor('operateur', 42);
    await request(app).get('/notifications/historique/accord_echeance/1').set('Cookie', cookie).expect(403);
    await request(app).get('/notifications/historique/courrier_relance/1').set('Cookie', cookie).expect(403);
    expect(getHistoriqueEntite).not.toHaveBeenCalled();
  });

  it('allows admin for accord_echeance and courrier_relance', async () => {
    const app = buildApp();
    const cookie = cookieFor('admin', 999);
    await request(app).get('/notifications/historique/accord_echeance/1').set('Cookie', cookie).expect(200);
    await request(app).get('/notifications/historique/courrier_relance/1').set('Cookie', cookie).expect(200);
  });
});

describe('notifications.route — GET /historique: recommandation_rappel (MISSION_REGISTRY_VIEW global, or personal responsableId)', () => {
  it('admin (MISSION_REGISTRY_VIEW) reads any recommandation history without an ownership check', async () => {
    const app = buildApp();
    await request(app)
      .get('/notifications/historique/recommandation_rappel/7')
      .set('Cookie', cookieFor('admin', 999))
      .expect(200);
    expect(estResponsableRecommandation).not.toHaveBeenCalled();
  });

  it("the responsable (agent, MISSION_VIEW_OWN) can read their own recommandation's history", async () => {
    estResponsableRecommandation.mockResolvedValue(true);
    const app = buildApp();
    await request(app)
      .get('/notifications/historique/recommandation_rappel/7')
      .set('Cookie', cookieFor('agent', 42))
      .expect(200);
    expect(estResponsableRecommandation).toHaveBeenCalledWith(7, 42);
  });

  it("User A (agent) cannot read history for a recommandation belonging only to User B — direct entiteId manipulation does not bypass authorization", async () => {
    estResponsableRecommandation.mockResolvedValue(false); // recommandation 7 belongs to someone else
    const app = buildApp();
    await request(app)
      .get('/notifications/historique/recommandation_rappel/7')
      .set('Cookie', cookieFor('agent', 42))
      .expect(403);
    expect(getHistoriqueEntite).not.toHaveBeenCalled();
  });
});

describe('notifications.route — POST /envoyer: accord_echeance/courrier_relance require AGREEMENT_MANAGE/CORRESPONDENCE_MANAGE', () => {
  it('403s agent/operateur regardless of entiteId', async () => {
    const app = buildApp();
    const cookie = cookieFor('operateur', 42);
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookie)
      .send({ type: 'accord_echeance', ...VALID_ENVOI })
      .expect(403);
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookie)
      .send({ type: 'courrier_relance', ...VALID_ENVOI })
      .expect(403);
    expect(envoyerNotificationCiblee).not.toHaveBeenCalled();
  });

  it('admin behavior preserved: allows admin to send accord_echeance/courrier_relance', async () => {
    const app = buildApp();
    const cookie = cookieFor('admin', 999);
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookie)
      .send({ type: 'accord_echeance', ...VALID_ENVOI })
      .expect(201);
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookie)
      .send({ type: 'courrier_relance', ...VALID_ENVOI })
      .expect(201);
  });
});

describe('notifications.route — POST /envoyer: recommandation_rappel (MISSION_RECOMMENDATION_MANAGE global, or personal responsableId)', () => {
  it('admin can send for any recommandation without an ownership check', async () => {
    const app = buildApp();
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookieFor('admin', 999))
      .send({ type: 'recommandation_rappel', ...VALID_ENVOI })
      .expect(201);
    expect(estResponsableRecommandation).not.toHaveBeenCalled();
  });

  it('the responsable (agent) can send a reminder for their own recommandation', async () => {
    estResponsableRecommandation.mockResolvedValue(true);
    const app = buildApp();
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookieFor('agent', 42))
      .send({ type: 'recommandation_rappel', ...VALID_ENVOI })
      .expect(201);
    expect(estResponsableRecommandation).toHaveBeenCalledWith(7, 42);
  });

  it('a manual reminder cannot target a recommandation the caller is not responsible for', async () => {
    estResponsableRecommandation.mockResolvedValue(false);
    const app = buildApp();
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookieFor('agent', 42))
      .send({ type: 'recommandation_rappel', ...VALID_ENVOI })
      .expect(403);
    expect(envoyerNotificationCiblee).not.toHaveBeenCalled();
  });
});

describe('notifications.route — input validation', () => {
  it('rejects an unknown notification type on both routes (fails closed, not a 500)', async () => {
    const app = buildApp();
    const cookie = cookieFor('admin', 999);
    await request(app)
      .get('/notifications/historique/not_a_real_type/1')
      .set('Cookie', cookie)
      .expect(400);
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookie)
      .send({ type: 'not_a_real_type', ...VALID_ENVOI })
      .expect(400);
  });

  it('rejects a missing required field on envoyer', async () => {
    const app = buildApp();
    await request(app)
      .post('/notifications/envoyer')
      .set('Cookie', cookieFor('admin', 999))
      .send({ type: 'accord_echeance', entiteId: 1 })
      .expect(400);
  });
});
