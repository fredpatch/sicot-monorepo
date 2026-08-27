// packages/server/src/modules/personnel-anac/routes/personnel-anac.route.ts
import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as personnelAnacController from '../controllers/personnel-anac.controller';

const router = Router();

// Consommé exclusivement par AdminUsersPage/CreateUserDialog pour rechercher
// un dossier de personnel ANAC à importer comme nouveau compte SICOT —
// relève de la gestion des utilisateurs (USER_MANAGE), pas d'un rôle figé.
router.use(authenticate, requireCapability('USER_MANAGE'));

router.get('/', personnelAnacController.lister);
router.get('/rechercher', personnelAnacController.rechercher);
router.get('/matricule/:matricule', personnelAnacController.getParMatricule);

export default router;