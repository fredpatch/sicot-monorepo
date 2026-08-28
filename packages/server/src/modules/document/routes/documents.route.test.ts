import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import documentsRouter from './documents.route';

// Direct-API security tests (prompt.md §37/§38), same pattern as prior
// modules: real router + real authenticate/requireCapability middleware
// over HTTP. lister/aggregates/getById/telecharger run for real (they
// carry the DOCUMENT_UPLOAD-derived personal-scoping fix); upload runs for
// real too (it deliberately has no route-level guard - the test proves the
// scoping happens via visibiliteInterne + verifierAccesDocument instead).
// Everything else is stubbed. Only the service layer is mocked.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

const listerDocuments = vi.fn().mockResolvedValue({ data: [], total: 0 });
const getDocumentsAggregates = vi.fn().mockResolvedValue({ total: 0 });
const verifierAccesDocument = vi.fn();
const getDocument = vi.fn().mockResolvedValue({ id: 1 });
const getCheminDocument = vi
  .fn()
  .mockResolvedValue({ chemin: '/tmp/x', nomOriginal: 'x', mimeType: 'text/plain' });
const uploaderDocument = vi.fn().mockResolvedValue({ document: { id: 1 }, doublon: false });

vi.mock('@/modules/document/services/documents.service.js', () => ({
  listerDocuments: (...args: unknown[]) => listerDocuments(...args),
  getDocumentsAggregates: (...args: unknown[]) => getDocumentsAggregates(...args),
  verifierAccesDocument: (...args: unknown[]) => verifierAccesDocument(...args),
  getDocument: (...args: unknown[]) => getDocument(...args),
  getCheminDocument: (...args: unknown[]) => getCheminDocument(...args),
  uploaderDocument: (...args: unknown[]) => uploaderDocument(...args),
  verifierDoublon: vi.fn().mockResolvedValue({ existe: false }),
  nouvellVersionDocument: vi.fn().mockResolvedValue({ id: 1, version: 2 }),
  corrigerOCR: vi.fn().mockResolvedValue({ id: 1 }),
  mettreAJourCategorie: vi.fn().mockResolvedValue({ id: 1 }),
  toggleVisibiliteInterne: vi.fn().mockResolvedValue({ id: 1 }),
  supprimerDocument: vi.fn().mockResolvedValue({ id: 1 }),
  restaurerDocument: vi.fn().mockResolvedValue({ id: 1 }),
  retraiterOCR: vi.fn().mockResolvedValue({ id: 1, statutOCR: 'traite' }),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, existsSync: () => false }; // 404 on telecharger past the auth check, fine for this test
});

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/documents', documentsRouter);
  return app;
}

function cookieFor(role: string, userId = 1) {
  const token = JSON.stringify({ userId, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

const NO_LIBRARY_ROLES = ['agent'];
const LIBRARY_ROLES = ['operateur', 'admin', 'super_admin'];

beforeEach(() => {
  listerDocuments.mockClear();
  getDocumentsAggregates.mockClear();
  verifierAccesDocument.mockReset().mockResolvedValue(undefined);
  uploaderDocument.mockClear().mockResolvedValue({ document: { id: 1 }, doublon: false });
});

describe('documents.route - 401 unauthenticated', () => {
  it('401s every route family when unauthenticated', async () => {
    const app = buildApp();
    await request(app).get('/documents').expect(401);
    await request(app).get('/documents/1').expect(401);
    await request(app).patch('/documents/1/ocr').expect(401);
    await request(app).delete('/documents/1').expect(401);
  });
});

describe('documents.route - general library management requires DOCUMENT_* capabilities (agent cannot manage)', () => {
  it.each(NO_LIBRARY_ROLES)(
    '403s role=%s on OCR/category/visibility/delete/restore/reprocess',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app)
        .patch('/documents/1/ocr')
        .set('Cookie', cookie)
        .send({ texte: 'x' })
        .expect(403);
      await request(app)
        .patch('/documents/1/categorie')
        .set('Cookie', cookie)
        .send({ categorie: 'autre' })
        .expect(403);
      await request(app)
        .patch('/documents/1/visibilite-interne')
        .set('Cookie', cookie)
        .send({ visible: true })
        .expect(403);
      await request(app).delete('/documents/1').set('Cookie', cookie).expect(403);
      await request(app).patch('/documents/1/restaurer').set('Cookie', cookie).expect(403);
      await request(app).post('/documents/1/retraiter-ocr').set('Cookie', cookie).expect(403);
    }
  );

  it.each(LIBRARY_ROLES)(
    'role=%s can perform approved document operations (has the capability)',
    async (role) => {
      const app = buildApp();
      const cookie = cookieFor(role);
      await request(app)
        .patch('/documents/1/ocr')
        .set('Cookie', cookie)
        .send({ texte: 'x' })
        .expect(200);
      await request(app)
        .patch('/documents/1/categorie')
        .set('Cookie', cookie)
        .send({ categorie: 'autre' })
        .expect(200);
      await request(app)
        .patch('/documents/1/visibilite-interne')
        .set('Cookie', cookie)
        .send({ visible: true })
        .expect(200);
      await request(app).delete('/documents/1').set('Cookie', cookie).expect(200);
      await request(app).patch('/documents/1/restaurer').set('Cookie', cookie).expect(200);
      await request(app).post('/documents/1/retraiter-ocr').set('Cookie', cookie).expect(200);
    }
  );
});

describe('documents.route - upload is open to every role (personal-workflow attachment, not library management)', () => {
  it.each([...NO_LIBRARY_ROLES, ...LIBRARY_ROLES])('role=%s can upload a file', async (role) => {
    const app = buildApp();
    await request(app)
      .post('/documents/upload')
      .set('Cookie', cookieFor(role))
      .attach('file', Buffer.from('hello'), 'test.txt')
      .expect(201);
  });

  it('an agent cannot self-publish visibiliteInterne=1 through upload - forced to false regardless of the request body', async () => {
    const app = buildApp();
    await request(app)
      .post('/documents/upload')
      .set('Cookie', cookieFor('agent'))
      .field('visibiliteInterne', '1')
      .attach('file', Buffer.from('hello'), 'test.txt')
      .expect(201);

    expect(uploaderDocument).toHaveBeenCalledWith(
      expect.objectContaining({ visibiliteInterne: false })
    );
  });

  it('an operateur CAN set visibiliteInterne=1 through upload', async () => {
    const app = buildApp();
    await request(app)
      .post('/documents/upload')
      .set('Cookie', cookieFor('operateur'))
      .field('visibiliteInterne', '1')
      .attach('file', Buffer.from('hello'), 'test.txt')
      .expect(201);

    expect(uploaderDocument).toHaveBeenCalledWith(
      expect.objectContaining({ visibiliteInterne: true })
    );
  });
});

describe('documents.route - reads scoped by capability, not the literal role "agent"', () => {
  it('agent listing is scoped to own/internal-visible documents (visibleOuUploadePar forced to own id)', async () => {
    const app = buildApp();
    await request(app).get('/documents').set('Cookie', cookieFor('agent', 42)).expect(200);
    expect(listerDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ visibleOuUploadePar: 42 })
    );
  });

  it.each(LIBRARY_ROLES)(
    'role=%s sees the full library (visibleOuUploadePar undefined)',
    async (role) => {
      const app = buildApp();
      await request(app).get('/documents').set('Cookie', cookieFor(role, 42)).expect(200);
      expect(listerDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ visibleOuUploadePar: undefined })
      );
    }
  );

  it('agent aggregates scoped to own id too', async () => {
    const app = buildApp();
    await request(app)
      .get('/documents/aggregates')
      .set('Cookie', cookieFor('agent', 42))
      .expect(200);
    expect(getDocumentsAggregates).toHaveBeenCalledWith(42);
  });

  it('getById: verifierAccesDocument is invoked with the real role, not bypassed', async () => {
    verifierAccesDocument.mockRejectedValueOnce(new Error('DOCUMENT_NON_AUTORISE'));
    const app = buildApp();
    await request(app).get('/documents/1').set('Cookie', cookieFor('agent', 42)).expect(403);
    expect(verifierAccesDocument).toHaveBeenCalledWith(1, { role: 'agent', userId: 42 });
  });
});
