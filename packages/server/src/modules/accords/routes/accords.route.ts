import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as accordsController from '../controllers/accords.controller.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Routes spéciales - avant /:id ─────────────────────────────────────────
router.get('/expirant', accordsController.expirantBientot);

// ── Lecture - accessible à tous ───────────────────────────────────────────
router.get('/', accordsController.lister);
router.get('/:id', accordsController.getById);
router.get('/:id/export/pdf', accordsController.exporterPDF);

// ── Création et modification - AGREEMENT_MANAGE ────────────────────────────
// Was requireRole('agent'), which under the old min-level hierarchy meant
// "any authenticated user" - a genuine over-permissive gap (see Phase 1
// audit §2/§20). AGREEMENT_MANAGE is granted to admin/super_admin only.
router.post('/', requireCapability('AGREEMENT_MANAGE'), accordsController.creer);
router.patch('/:id', requireCapability('AGREEMENT_MANAGE'), accordsController.mettreAJour);

// ── Renouvellement - AGREEMENT_MANAGE ──────────────────────────────────────
router.post('/:id/renouveler', requireCapability('AGREEMENT_MANAGE'), accordsController.renouveler);

export default router;
