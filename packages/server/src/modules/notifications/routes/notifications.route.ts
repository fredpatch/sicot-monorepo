import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as notificationsController from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate);

router.get('/recentes', requireRole('admin'), notificationsController.recentes);
router.get(
  '/historique/:type/:entiteId',
  requireRole('agent'),
  notificationsController.historiqueEntite
);

// Envoi réservé CCIT (admin minimum), sauf relance de recommandation de
// mission — agent minimum, restriction de type appliquée dans le contrôleur
// (cf. Missions §12 du plan de refonte : un agent doit pouvoir relancer une
// recommandation dont il est responsable sans devenir admin).
router.post('/envoyer', requireRole('agent'), notificationsController.envoyer);

export default router;
