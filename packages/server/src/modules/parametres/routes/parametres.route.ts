import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as parametresController from '../controllers/parametres.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin'), parametresController.lister);
router.get('/:cle', requireRole('admin'), parametresController.getByCle);
router.patch('/:cle', requireRole('super_admin'), parametresController.mettreAJour);

export default router;
