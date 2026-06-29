import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as courriersController from '../controllers/courriers.controller.js';
import { requireRole } from '@/middleware/requiredRole.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/sans-reponse', courriersController.sansReponse);

// ── Lecture — accessible à tous ───────────────────────────────────────────
router.get('/', courriersController.lister);
router.get('/:id', courriersController.getById);
router.get('/:id/fil', courriersController.getFilCorrespondance);

// ── Création et modification — agent minimum ──────────────────────────────
router.post('/', requireRole('agent'), courriersController.creer);
router.patch('/:id', requireRole('agent'), courriersController.mettreAJour);

export default router;
