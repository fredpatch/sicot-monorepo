import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import * as glossaireController from '../controllers/glossaire.controller.js';

const router = Router();

router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
// Outil de travail traducteur/relecteur — un agent n'a pas d'usage légitime
// du glossaire (ni l'écran, ni l'API directe depuis ce nettoyage).
router.get('/aggregates', requireRole('traducteur'), glossaireController.aggregates);
router.get('/suggestions', requireRole('traducteur'), glossaireController.suggestions);
router.post('/import', requireRole('traducteur'), glossaireController.importerCSV);

// ── Lecture ────────────────────────────────────────────────────────────────
router.get('/', requireRole('traducteur'), glossaireController.lister);
router.get('/:id', requireRole('traducteur'), glossaireController.getById);

// ── Création et modification — traducteur minimum ─────────────────────────
router.post('/', requireRole('traducteur'), glossaireController.creer);
router.patch('/:id', requireRole('traducteur'), glossaireController.mettreAJour);
router.patch('/:id/desactiver', requireRole('traducteur'), glossaireController.desactiver);
router.patch('/:id/reactiver', requireRole('traducteur'), glossaireController.reactiver);

export default router;
