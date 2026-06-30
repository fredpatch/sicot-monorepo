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

// Envoi réservé CCIT (admin minimum)
router.post('/envoyer', requireRole('admin'), notificationsController.envoyer);

export default router;
