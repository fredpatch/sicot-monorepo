import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
import * as accordsController from '../controllers/accords.controller.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/expirant', accordsController.expirantBientot);

// ── Lecture — accessible à tous ───────────────────────────────────────────
router.get('/', accordsController.lister);
router.get('/:id', accordsController.getById);

// ── Création et modification — agent minimum ──────────────────────────────
router.post('/', requireRole('agent'), accordsController.creer);
router.patch('/:id', requireRole('agent'), accordsController.mettreAJour);

// ── Renouvellement — agent minimum ────────────────────────────────────────
router.post('/:id/renouveler', requireRole('agent'), accordsController.renouveler);

export default router;
