import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as missionsController from '../controllers/missions.controller';
import { requireRole } from '@/middleware/requiredRole';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/recommandations/en-attente', missionsController.recommandationsEnAttente);

// ── Lecture — accessible à tous ───────────────────────────────────────────
router.get('/', missionsController.lister);
router.get('/:id', missionsController.getById);
router.get('/:id/recommandations', missionsController.listerRecommandations);

// ── Création et modification — agent minimum ──────────────────────────────
router.post('/', requireRole('agent'), missionsController.creer);
router.patch('/:id', requireRole('agent'), missionsController.mettreAJour);

// ── Recommandations ───────────────────────────────────────────────────────
router.post('/:id/recommandations', requireRole('agent'), missionsController.ajouterRecommandation);
router.patch(
  '/recommandations/:recId',
  requireRole('agent'),
  missionsController.mettreAJourRecommandation
);

export default router;
