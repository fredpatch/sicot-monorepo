import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { createLoginLimiter } from '@/middleware/rateLimiters';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Rate limit strict, réservé à /login (pas au routeur /api/auth entier) :
// /refresh est du trafic de session normal, et SICOT a des utilisateurs
// partageant une IP institutionnelle/NAT - un même seuil sur les deux
// aurait pu déclencher un 429 sur du /refresh légitime. Le verrouillage de
// compte (auth.helpers.ts, lockout_max_tentatives/lockout_duree_minutes)
// reste la défense principale contre le brute-force ciblé sur un compte ;
// ce limiteur IP protège contre le spray/flood, pas contre l'échec répété
// sur un seul compte.
const loginLimiter = createLoginLimiter();

// Public - pas besoin d'être connecté
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);

// Protégées - nécessitent un token valide
router.post('/set-password', authenticate, authController.setPassword);
router.post('/changer-mot-de-passe', authenticate, authController.changerMotDePasse);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
