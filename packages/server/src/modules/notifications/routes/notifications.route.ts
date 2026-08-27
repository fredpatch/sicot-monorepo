import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import * as notificationsController from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate);

// Résumé multi-domaines pour le dashboard (pas de relation propriétaire par
// entité possible ici, contrairement à historique/envoyer) — ANALYTICS_VIEW,
// même capacité que le reste du dashboard.
router.get('/recentes', requireCapability('ANALYTICS_VIEW'), notificationsController.recentes);

// historique/:type/:entiteId et envoyer : l'autorisation dépend du type de
// notification ciblé (domaine différent par type) et, pour
// recommandation_rappel, de la relation responsableId — impossible à
// exprimer comme une seule capacité statique au niveau du routeur. Voir
// notifications.policies.ts (Phase 7.1) : chaque contrôleur vérifie
// peutConsulterHistorique/peutEnvoyerNotification avant d'agir.
router.get('/historique/:type/:entiteId', notificationsController.historiqueEntite);
router.post('/envoyer', notificationsController.envoyer);

export default router;
