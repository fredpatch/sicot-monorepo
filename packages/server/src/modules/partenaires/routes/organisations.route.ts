import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as organisationsController from '../controllers/organisations.controller.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Métadonnées pour les filtres ──────────────────────────────────────────
// Déclarées AVANT /:id pour éviter les conflits de paramètres
router.get('/meta/pays', organisationsController.getPays);
router.get('/meta/regions', organisationsController.getRegions);

// ── Organisations ─────────────────────────────────────────────────────────
// Lecture inchangée (ouverte à tout utilisateur authentifié) - voir
// Phase 1 audit ; l'écriture était requireRole('agent'), qui sous
// l'ancienne hiérarchie signifiait "tout utilisateur authentifié" - un
// vrai trou de sécurité (Phase 1 §2/§20). PARTNER_MANAGE est réservé à
// admin/super_admin.
router.get('/', organisationsController.lister);
router.post('/', requireCapability('PARTNER_MANAGE'), organisationsController.creer);
router.get('/:id', organisationsController.getById);
router.patch('/:id', requireCapability('PARTNER_MANAGE'), organisationsController.mettreAJour);

// ── Contacts d'une organisation ───────────────────────────────────────────
router.get('/:id/contacts', organisationsController.listerContacts);
router.post(
  '/:id/contacts',
  requireCapability('PARTNER_MANAGE'),
  organisationsController.creerContact
);

// ── Actions sur un contact spécifique ────────────────────────────────────
router.patch(
  '/contacts/:contactId',
  requireCapability('PARTNER_MANAGE'),
  organisationsController.mettreAJourContact
);
router.patch(
  '/contacts/:contactId/principal',
  requireCapability('PARTNER_MANAGE'),
  organisationsController.definirPrincipal
);

export default router;
