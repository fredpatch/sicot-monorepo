import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as jobsController from '../controllers/jobs.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin'), jobsController.lister);

// Jobs courants — admin suffit (recalcul statuts, alertes, vérifications)
router.post('/:cle/executer', requireRole('admin'), jobsController.executer);

export default router;
