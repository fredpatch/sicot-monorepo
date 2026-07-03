import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireTraducteur } from '@/middleware/requiredRole';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

// Toutes les routes analytics nécessitent d'être connecté ET traducteur minimum
router.use(authenticate, requireTraducteur);

// ── M1 Accords ──────────────────────────────────────────────────────────
router.get('/accords', analyticsController.accords);

// ── M2 Courriers ───────────────────────────────────────────────────────
router.get('/courriers', analyticsController.courriers);

// ── M3 Missions ────────────────────────────────────────────────────────
router.get('/missions', analyticsController.missions);

// ─ M4 Traduction ─────────────────────────────────────────────────────
router.get('/traductions', analyticsController.traduction);

// ── M5 Demandes ─────────────────────────────────────────────────────
router.get('/demandes', analyticsController.demandes);

// ── M6 Documents ─────────────────────────────────
router.get('/documents', analyticsController.documents);

// ── M7 Glossaire ─────────────────────────────────
router.get('/glossaire', analyticsController.glossaire);

// ── M8 Global ─────────────────────────────────
router.get('/global', analyticsController.global);

export default router;
