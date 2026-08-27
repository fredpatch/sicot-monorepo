import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as portailController from '../controllers/portal.controller';

const router = Router();

// ── Rate limiting — portail public exposé sans authentification ──────────
// Le limiteur global (index.ts) est désactivé pour l'app entière ; le
// portail public est la surface d'abus la plus évidente (recherche libre,
// génération de token par email) donc il porte ses propres limiteurs,
// sans toucher au reste de l'app.
const listeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de demandes de lien de téléchargement, réessayez plus tard.' },
});

// ── Routes PUBLIQUES — aucune auth ANAC requise ───────────────────────────
// Déclarée avant /documents/:id pour éviter que "aggregates" soit capturé
// comme un ID (même précaution que documents.route.ts).
router.get('/documents/aggregates', listeLimiter, portailController.aggregates);
router.get('/documents', listeLimiter, portailController.lister);
router.get('/documents/:id', portailController.getDocument);
router.get('/documents/:id/consulter', portailController.consulter);
router.post('/documents/:id/token', tokenLimiter, portailController.genererToken);
router.get('/telecharger/:token', portailController.telecharger);

// ── Routes ADMIN — gestion visibilité ────────────────────────────────────
router.patch(
  '/documents/:id/visibilite',
  authenticate,
  requireCapability('PORTAL_PUBLICATION_MANAGE'),
  portailController.toggleVisibilite
);

export default router;
