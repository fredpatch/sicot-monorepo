import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireAdmin, requireTraducteur } from '@/middleware/requiredRole';
import * as analyticsController from '../controllers/analytics.controller';
import * as rapportsController from '@/modules/report/controllers/rapports.controller';

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

// ── Export Excel ─────────────────────────────────
router.get('/export', analyticsController.exporterAnalytics);

// ── Rapports ───────────────────────────────────────────────
router.post('/rapports', rapportsController.genererRapport);
router.get('/rapports', rapportsController.listerRapports);

// ── Rapports IA (narratif d'analyse) ───────────────────────────────
router.get('/rapports/:id', rapportsController.getRapportDetail);
router.post('/rapports/:id/analyse-ia', rapportsController.genererAnalyseIA);
router.patch('/rapports/:id/analyse-ia', requireAdmin, rapportsController.validerAnalyseIA);

// ── Statut Gemini Quota ─────────────────────────────────────────────
router.get('/gemini-usage', requireAdmin, analyticsController.statutGemini);

export default router;
