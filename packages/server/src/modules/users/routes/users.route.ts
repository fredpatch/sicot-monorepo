import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireAdmin } from '@/middleware/requiredRole';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Toutes les routes users nécessitent d'être connecté ET admin minimum
router.use(authenticate, requireAdmin);

// ── Liste et création ─────────────────────────────────────────────────────
router.get('/', usersController.lister);
router.post('/', usersController.creer);

// ── Consultation et modification ──────────────────────────────────────────
router.get('/:id', usersController.getById);
router.patch('/:id', usersController.mettreAJour);

// ── Actions spécifiques ───────────────────────────────────────────────────
router.patch('/:id/activation', usersController.toggleActivation);
router.post('/:id/reinitialiser-otp', usersController.reinitialiserOTP);

export default router;
