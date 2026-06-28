import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireAdmin } from '../../../middleware/requiredRole';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Toutes les routes audit nécessitent d'être connecté ET admin minimum
router.use(authenticate, requireAdmin);

// ── Métadonnées pour les filtres ──────────────────────────────────────────
// Ces routes doivent être déclarées AVANT /:id
// sinon Express interpréterait "modules" et "actions" comme des IDs
router.get('/meta/modules', auditController.getModules);
router.get('/meta/actions', auditController.getActions);

// ── Journal ───────────────────────────────────────────────────────────────
router.get('/', auditController.lister);
router.get('/:id', auditController.getById);

export default router;
