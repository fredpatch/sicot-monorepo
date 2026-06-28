import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
import * as organisationsController from '../controllers/organisations.controller.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Métadonnées pour les filtres ──────────────────────────────────────────
// Déclarées AVANT /:id pour éviter les conflits de paramètres
router.get('/meta/pays', organisationsController.getPays);
router.get('/meta/regions', organisationsController.getRegions);

// ── Organisations ─────────────────────────────────────────────────────────
router.get('/', organisationsController.lister);
router.post('/', requireRole('agent'), organisationsController.creer);
router.get('/:id', organisationsController.getById);
router.patch('/:id', requireRole('agent'), organisationsController.mettreAJour);

// ── Contacts d'une organisation ───────────────────────────────────────────
router.get('/:id/contacts', organisationsController.listerContacts);
router.post('/:id/contacts', requireRole('agent'), organisationsController.creerContact);

// ── Actions sur un contact spécifique ────────────────────────────────────
router.patch(
  '/contacts/:contactId',
  requireRole('agent'),
  organisationsController.mettreAJourContact
);
router.patch(
  '/contacts/:contactId/principal',
  requireRole('agent'),
  organisationsController.definirPrincipal
);

export default router;
