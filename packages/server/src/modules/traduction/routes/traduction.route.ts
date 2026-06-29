import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
import * as traductionController from '../controllers/traduction.controller';

const router = Router();

router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/moteur/status', traductionController.moteurStatus);

// ── Lecture ───────────────────────────────────────────────────────────────
router.get('/', traductionController.lister);
router.get('/:id', traductionController.getById);

// ── Suggestions glossaire pour l'éditeur ──────────────────────────────────
router.get('/:id/suggestions', traductionController.suggestions);

// ── Lancer une traduction — traducteur minimum ────────────────────────────
router.post('/', requireRole('traducteur'), traductionController.lancer);

// ── Workflow traduction ────────────────────────────────────────────────────
router.patch(
  '/:id/correction',
  requireRole('traducteur'),
  traductionController.sauvegarderCorrection
);
router.patch('/:id/approuver', requireRole('relecteur'), traductionController.approuver);
router.patch('/:id/archiver', requireRole('relecteur'), traductionController.archiver);

export default router;
