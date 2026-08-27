import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as jobsController from '../controllers/jobs.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin'), jobsController.lister);

// ⚠️ Déclarée avant /:cle/executer n'est pas nécessaire ici (chemins distincts),
// mais avant toute future route /:id générique si elle apparaît un jour.
router.get('/historique', requireRole('admin'), jobsController.historique);

// Jobs courants — admin suffit (recalcul statuts, alertes, vérifications)
router.post('/:cle/executer', requireRole('admin'), jobsController.executer);

export default router;
