import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as demandesController from '../controllers/demandes.controller.js';

const router = Router();

router.use(authenticate);

// ── Lecture — accessible à tous ───────────────────────────────────────────
router.get('/', demandesController.lister);
router.get('/:id', demandesController.getById);

// ── Création — tout agent peut soumettre ──────────────────────────────────
router.post('/', requireRole('agent'), demandesController.creer);

// ── Rappel — demandeur uniquement (vérifié dans le service) ───────────────
router.patch('/:id/rappeler', requireRole('agent'), demandesController.rappeler);

// ── Prise en charge — traducteur minimum ──────────────────────────────────
router.patch(
  '/:id/prendre-en-charge',
  requireRole('traducteur'),
  demandesController.prendreEnCharge
);
router.patch('/:id/relecture', requireRole('traducteur'), demandesController.passerEnRelecture);

// ── Validation priorité et workflow — admin/relecteur ────────────────────
router.patch('/:id/priorite', requireRole('relecteur'), demandesController.validerPriorite);
router.patch('/:id/valider', requireRole('relecteur'), demandesController.valider);
router.patch('/:id/archiver', requireRole('relecteur'), demandesController.archiver);

export default router;
