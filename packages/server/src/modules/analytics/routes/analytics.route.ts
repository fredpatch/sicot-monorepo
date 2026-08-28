import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as analyticsController from '../controllers/analytics.controller';
import * as rapportsController from '@/modules/report/controllers/rapports.controller';

const router = Router();

// Toutes les routes analytics/rapports nécessitent d'être connecté ET
// ANALYTICS_VIEW (admin+). Était requireTraducteur (traducteur/relecteur/
// admin/super_admin) - un vrai écart avec le frontend, qui n'a jamais
// exposé /analytics au-delà de admin+ (router.tsx: ROLES_CCIT_ADMIN).
// Aucun flux utilisateur réel n'utilisait cet accès API traducteur+ ; ce
// changement ferme un accès API direct qui n'était jamais atteignable
// depuis l'UI, dans le même esprit que les autres modules "trop
// permissifs" fermés en Phase 4 (Accords/Partenaires/Missions/Courriers).
router.use(authenticate, requireCapability('ANALYTICS_VIEW'));

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
// ADMIN_MONITORING_VIEW plutôt que ANALYTICS_VIEW ici et pour /gemini-usage
// ci-dessous - sous-actions explicitement admin-only (§Phase 4.8.4) : même
// palier aujourd'hui, mais une capacité distincte les protège si
// ANALYTICS_VIEW est un jour élargie à operateur+ (prompt.md §29 l'évoque
// comme option future) sans que ces deux-là suivent automatiquement.
router.patch(
  '/rapports/:id/analyse-ia',
  requireCapability('ADMIN_MONITORING_VIEW'),
  rapportsController.validerAnalyseIA
);

// ── Statut Gemini Quota ─────────────────────────────────────────────
router.get(
  '/gemini-usage',
  requireCapability('ADMIN_MONITORING_VIEW'),
  analyticsController.statutGemini
);

export default router;
