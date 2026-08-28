import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as courriersController from '../controllers/courriers.controller.js';
import { requireCapability } from '@/middleware/requireCapability.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Routes spéciales - avant /:id ─────────────────────────────────────────
router.get('/sans-reponse', courriersController.sansReponse);
router.get('/aggregates', courriersController.aggregates);

// ── Lecture - accessible à tous ───────────────────────────────────────────
router.get('/', courriersController.lister);
router.get('/:id', courriersController.getById);
router.get('/:id/fil', courriersController.getFilCorrespondance);
router.get('/:id/export/pdf', courriersController.exporterPDF);

// ── Création, modification, pièces jointes - CORRESPONDENCE_MANAGE ─────────
// Was requireRole('agent'), which under the old min-level hierarchy meant
// "any authenticated user" - a genuine over-permissive gap (Phase 1 audit
// §2/§20). Attachment routes audited: courriers/documents are institutional
// records with no per-user ownership concept (unlike demandes/missions), so
// the route-level capability gate is the only authorization boundary that
// applies here - no IDOR/ownership gap found.
router.post('/', requireCapability('CORRESPONDENCE_MANAGE'), courriersController.creer);
router.patch('/:id', requireCapability('CORRESPONDENCE_MANAGE'), courriersController.mettreAJour);
router.post(
  '/:id/documents',
  requireCapability('CORRESPONDENCE_MANAGE'),
  courriersController.ajouterDocument
);
router.delete(
  '/:id/documents/:documentId',
  requireCapability('CORRESPONDENCE_MANAGE'),
  courriersController.retirerDocument
);

export default router;
