import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as glossaireController from '../controllers/glossaire.controller.js';

const router = Router();

router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/suggestions', glossaireController.suggestions);
router.post('/import', requireRole('traducteur'), glossaireController.importerCSV);

// ── Lecture — accessible à tous ───────────────────────────────────────────
router.get('/', glossaireController.lister);
router.get('/:id', glossaireController.getById);

// ── Création et modification — traducteur minimum ─────────────────────────
router.post('/', requireRole('traducteur'), glossaireController.creer);
router.patch('/:id', requireRole('traducteur'), glossaireController.mettreAJour);
router.patch('/:id/desactiver', requireRole('traducteur'), glossaireController.desactiver);

export default router;
