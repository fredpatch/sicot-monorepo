import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import * as glossaireController from '../controllers/glossaire.controller.js';

const router = Router();

router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
// Outil de travail opérationnel — un agent n'a pas d'usage légitime du
// glossaire (ni l'écran, ni l'API directe). GLOSSARY_VIEW/MANAGE sont
// réservées à operateur+.
router.get('/aggregates', requireCapability('GLOSSARY_VIEW'), glossaireController.aggregates);
router.get('/suggestions', requireCapability('GLOSSARY_VIEW'), glossaireController.suggestions);
router.post('/import', requireCapability('GLOSSARY_MANAGE'), glossaireController.importerCSV);

// ── Lecture ────────────────────────────────────────────────────────────────
router.get('/', requireCapability('GLOSSARY_VIEW'), glossaireController.lister);
router.get('/:id', requireCapability('GLOSSARY_VIEW'), glossaireController.getById);

// ── Création et modification — GLOSSARY_MANAGE ─────────────────────────────
router.post('/', requireCapability('GLOSSARY_MANAGE'), glossaireController.creer);
router.patch('/:id', requireCapability('GLOSSARY_MANAGE'), glossaireController.mettreAJour);
router.patch('/:id/desactiver', requireCapability('GLOSSARY_MANAGE'), glossaireController.desactiver);
router.patch('/:id/reactiver', requireCapability('GLOSSARY_MANAGE'), glossaireController.reactiver);

export default router;
