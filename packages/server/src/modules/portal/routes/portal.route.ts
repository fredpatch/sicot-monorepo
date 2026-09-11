import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import {
  createPortalListLimiter,
  createPortalTokenLimiter,
  createPortalViewLimiter,
} from '@/middleware/rateLimiters';
import * as portailController from '../controllers/portal.controller';

const router = Router();

// ── Rate limiting - portail public exposé sans authentification ──────────
// Le limiteur global (index.ts) couvre /api/* comme filet de sécurité
// volumétrique ; le portail public reste la surface d'abus la plus
// évidente (recherche libre, génération de token par email, consultation/
// téléchargement par ID ou token devinable) donc il porte ses propres
// limiteurs, plus stricts, en complément.
const listeLimiter = createPortalListLimiter();
const tokenLimiter = createPortalTokenLimiter();
const viewLimiter = createPortalViewLimiter();

// ── Routes PUBLIQUES - aucune auth ANAC requise ───────────────────────────
// Déclarée avant /documents/:id pour éviter que "aggregates" soit capturé
// comme un ID (même précaution que documents.route.ts).
router.get('/documents/aggregates', listeLimiter, portailController.aggregates);
router.get('/documents', listeLimiter, portailController.lister);
router.get('/documents/:id', viewLimiter, portailController.getDocument);
router.get('/documents/:id/consulter', viewLimiter, portailController.consulter);
router.post('/documents/:id/token', tokenLimiter, portailController.genererToken);
router.get('/telecharger/:token', viewLimiter, portailController.telecharger);

// ── Routes ADMIN - gestion visibilité ────────────────────────────────────
router.patch(
  '/documents/:id/visibilite',
  authenticate,
  requireCapability('PORTAL_PUBLICATION_MANAGE'),
  portailController.toggleVisibilite
);

export default router;
