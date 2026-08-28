import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Toutes les routes audit nécessitent d'être connecté ET AUDIT_VIEW -
// une seule garde au niveau routeur pour tout le module, lectures ET
// exports inclus (même limite d'autorisation partout). Was requireAdmin,
// même ensemble effectif (admin+).
router.use(authenticate, requireCapability('AUDIT_VIEW'));

// ── Métadonnées pour les filtres ──────────────────────────────────────────
// Ces routes doivent être déclarées AVANT /:id
// sinon Express interpréterait "modules" et "actions" comme des IDs
router.get('/meta/modules', auditController.getModules);
router.get('/meta/actions', auditController.getActions);

// ── Exports - même contrainte d'ordre que les routes meta ci-dessus ──────
router.get('/export/pdf', auditController.exporterPDF);
router.get('/export/excel', auditController.exporterExcel);

// ── Journal ───────────────────────────────────────────────────────────────
router.get('/', auditController.lister);
router.get('/:id', auditController.getById);

export default router;
