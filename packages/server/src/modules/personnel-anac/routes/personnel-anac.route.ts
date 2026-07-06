// packages/server/src/modules/personnel-anac/routes/personnel-anac.route.ts
import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireAdmin } from '@/middleware/requiredRole';
import * as personnelAnacController from '../controllers/personnel-anac.controller';

const router = Router();

// Réservé aux admins — c'est AdminUsersPage qui consomme ceci
router.use(authenticate, requireAdmin);

router.get('/', personnelAnacController.lister);
router.get('/rechercher', personnelAnacController.rechercher);
router.get('/matricule/:matricule', personnelAnacController.getParMatricule);

export default router;