import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Public — pas besoin d'être connecté
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protégées — nécessitent un token valide
router.post('/set-password', authenticate, authController.setPassword);
router.post('/changer-mot-de-passe', authenticate, authController.changerMotDePasse);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;