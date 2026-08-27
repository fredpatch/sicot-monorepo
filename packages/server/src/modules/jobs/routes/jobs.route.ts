import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import * as jobsController from '../controllers/jobs.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireCapability('JOB_EXECUTE'), jobsController.lister);

// ⚠️ Déclarée avant /:cle/executer n'est pas nécessaire ici (chemins distincts),
// mais avant toute future route /:id générique si elle apparaît un jour.
router.get('/historique', requireCapability('JOB_EXECUTE'), jobsController.historique);

// JOB_EXECUTE (admin+) à la route ; la restriction supplémentaire pour les
// jobs à haut risque (SYSTEM_ADMIN_OPERATION, super_admin only) est
// appliquée séparément dans jobs.service.ts:executerJobManuel, par job.
router.post('/:cle/executer', requireCapability('JOB_EXECUTE'), jobsController.executer);

export default router;
