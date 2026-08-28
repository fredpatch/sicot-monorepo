import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Toutes les routes users nécessitent d'être connecté ; la capacité minimum
// est appliquée par route ci-dessous (pas au niveau du routeur), car la
// LISTE (lecture seule) doit rester accessible via USER_DIRECTORY_VIEW -
// utilisée par le sélecteur de participants du module Missions - alors que
// la création et la gestion des comptes restent réservées à USER_MANAGE
// (admin+). Was requireRole('agent')/requireAdmin - same effective role
// sets, now expressed as distinct capabilities (Phase 4.8).
router.use(authenticate);

// ── Liste - USER_DIRECTORY_VIEW (lecture seule) ───────────────────────────
router.get('/', requireCapability('USER_DIRECTORY_VIEW'), usersController.lister);

// ⚠️ Déclarée avant /:id pour éviter que 'aggregates' soit capturé comme un ID
router.get('/aggregates', requireCapability('USER_MANAGE'), usersController.aggregates);

// ── Création - USER_MANAGE ─────────────────────────────────────────────────
router.post('/', requireCapability('USER_MANAGE'), usersController.creer);

// ── Consultation et modification - USER_MANAGE ─────────────────────────────
router.get('/:id', requireCapability('USER_MANAGE'), usersController.getById);
router.patch('/:id', requireCapability('USER_MANAGE'), usersController.mettreAJour);

// ── Actions spécifiques - USER_MANAGE ───────────────────────────────────────
router.patch('/:id/activation', requireCapability('USER_MANAGE'), usersController.toggleActivation);
router.post(
  '/:id/reinitialiser-otp',
  requireCapability('USER_MANAGE'),
  usersController.reinitialiserOTP
);

export default router;
