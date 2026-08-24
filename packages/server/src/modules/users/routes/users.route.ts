import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireAdmin, requireRole } from '@/middleware/requiredRole';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Toutes les routes users nécessitent d'être connecté ; le rôle minimum
// est appliqué par route ci-dessous (pas au niveau du routeur), car la
// LISTE (lecture seule) doit rester accessible à un agent — utilisée par
// le sélecteur de participants du module Missions — alors que la création
// et la gestion des comptes restent réservées admin+.
router.use(authenticate);

// ── Liste — agent minimum (lecture seule) ─────────────────────────────────
router.get('/', requireRole('agent'), usersController.lister);

// ── Création — admin minimum ──────────────────────────────────────────────
router.post('/', requireAdmin, usersController.creer);

// ── Consultation et modification — admin minimum ──────────────────────────
router.get('/:id', requireAdmin, usersController.getById);
router.patch('/:id', requireAdmin, usersController.mettreAJour);

// ── Actions spécifiques — admin minimum ───────────────────────────────────
router.patch('/:id/activation', requireAdmin, usersController.toggleActivation);
router.post('/:id/reinitialiser-otp', requireAdmin, usersController.reinitialiserOTP);

export default router;
