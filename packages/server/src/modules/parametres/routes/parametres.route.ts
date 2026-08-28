import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import * as parametresController from '../controllers/parametres.controller.js';

const router = Router();

router.use(authenticate);

// SYSTEM_SETTINGS_VIEW (admin+) vs SYSTEM_SETTINGS_MANAGE (super_admin
// only) - was requireRole('admin')/requireRole('super_admin'), same
// effective role sets. SYSTEM_SETTINGS_MANAGE is deliberately absent from
// ADMIN_CAPABILITIES (see packages/shared/src/auth/role-capabilities.ts),
// so this migration cannot silently broaden write access to admin.
router.get('/', requireCapability('SYSTEM_SETTINGS_VIEW'), parametresController.lister);
router.get('/:cle', requireCapability('SYSTEM_SETTINGS_VIEW'), parametresController.getByCle);
router.patch(
  '/:cle',
  requireCapability('SYSTEM_SETTINGS_MANAGE'),
  parametresController.mettreAJour
);

export default router;
