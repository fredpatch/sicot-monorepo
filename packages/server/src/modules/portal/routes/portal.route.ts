import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
import * as portailController from '../controllers/portal.controller';

const router = Router();

// ── Routes PUBLIQUES — aucune auth ANAC requise ───────────────────────────
router.get('/documents', portailController.lister);
router.get('/documents/:id', portailController.getDocument);
router.get('/documents/:id/consulter', portailController.consulter);
router.post('/documents/:id/token', portailController.genererToken);
router.get('/telecharger/:token', portailController.telecharger);

// ── Routes ADMIN — gestion visibilité ────────────────────────────────────
router.patch(
  '/documents/:id/visibilite',
  authenticate,
  requireRole('admin'),
  portailController.toggleVisibilite
);

export default router;
