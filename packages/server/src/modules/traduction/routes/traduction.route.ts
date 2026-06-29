import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
import * as traductionController from '../controllers/traduction.controller';

const router = Router();

router.use(authenticate);

// ── Timeout 3 minutes pour les traductions longues ────────────────────────
router.use((req, res, next) => {
  res.setTimeout(450000); // 7.5 minutes pour les gros documents
  next();
});

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

// ── Suppression / restauration ─────────────────────────────────────────────
router.delete('/:id', requireRole('traducteur'), traductionController.supprimer);
router.patch('/:id/restaurer', requireRole('traducteur'), traductionController.restaurer);

export default router;
