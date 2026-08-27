import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import * as missionsController from '../controllers/missions.controller';
import { requireCapability } from '@/middleware/requireCapability';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/recommandations/en-attente', missionsController.recommandationsEnAttente);
// participantId (filtre facultatif) est vérifié/dérivé dans le controller —
// voir missions.controller.ts resolveParticipantFilter(). Un utilisateur
// sans MISSION_REGISTRY_VIEW ne peut jamais obtenir les missions de
// quelqu'un d'autre en changeant ce paramètre (IDOR corrigé Phase 4.3).
router.get('/aggregates', missionsController.aggregates);

// ── Lecture — accessible à tous ───────────────────────────────────────────
router.get('/', missionsController.lister);
router.get('/:id', missionsController.getById);
router.get('/:id/recommandations', missionsController.listerRecommandations);
router.get('/:id/export/pdf', missionsController.exporterPDF);

// ── Création et modification — MISSION_MANAGE ──────────────────────────────
// Was requireRole('agent'), which under the old min-level hierarchy meant
// "any authenticated user" — a genuine over-permissive gap (Phase 1 audit
// §2/§20). MISSION_MANAGE is granted to admin/super_admin only.
router.post('/', requireCapability('MISSION_MANAGE'), missionsController.creer);
router.patch('/:id', requireCapability('MISSION_MANAGE'), missionsController.mettreAJour);

// ── Rapport officiel — workflow personnel (Phase 8) ─────────────────────
// Autorisation contextuelle (MISSION_MANAGE global OU participant désigné
// rapportResponsableId) — impossible à exprimer comme une seule capacité
// statique au niveau du routeur, donc vérifiée dans le contrôleur (même
// motif que notifications.route.ts Phase 7.1).
router.patch('/:id/rapport', missionsController.definirRapportPersonnel);

// ── Recommandations — MISSION_RECOMMENDATION_MANAGE ────────────────────────
router.post(
  '/:id/recommandations',
  requireCapability('MISSION_RECOMMENDATION_MANAGE'),
  missionsController.ajouterRecommandation
);
router.patch(
  '/recommandations/:recId',
  requireCapability('MISSION_RECOMMENDATION_MANAGE'),
  missionsController.mettreAJourRecommandation
);

export default router;
