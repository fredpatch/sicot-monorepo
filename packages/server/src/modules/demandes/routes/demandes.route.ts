import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import * as demandesController from '../controllers/demandes.controller.js';

const router = Router();

router.use(authenticate);

// ── Lecture — accessible à tous, portée personnelle appliquée dans le
// controller pour qui n'a pas REQUEST_QUEUE_VIEW (voir demandes.controller.ts
// aSeulementLaPorteePersonnelle) ─────────────────────────────────────────
router.get('/', demandesController.lister);
router.get('/aggregates', demandesController.aggregates);
router.get('/:id', demandesController.getById);

// ── Création — capacité personnelle, tous les rôles cibles l'ont ──────────
router.post('/', requireCapability('REQUEST_CREATE_OWN'), demandesController.creer);

// ── Rappel — capacité personnelle ; propriété (demandeurId === userId)
// déjà vérifiée dans demandes.service.ts:rappelerDemande ──────────────────
router.patch('/:id/rappeler', requireCapability('REQUEST_RECALL_OWN'), demandesController.rappeler);

// ── Prise en charge / soumission en relecture — REQUEST_TAKE /
// REQUEST_SUBMIT_REVIEW (operateur+ ; agent exclu) ─────────────────────────
router.patch(
  '/:id/prendre-en-charge',
  requireCapability('REQUEST_TAKE'),
  demandesController.prendreEnCharge
);
router.patch(
  '/:id/relecture',
  requireCapability('REQUEST_SUBMIT_REVIEW'),
  demandesController.passerEnRelecture
);

// ── Validation priorité et workflow ─────────────────────────────────────
// Was requireRole('relecteur') — only the legacy relecteur/admin/super_admin
// could validate priority/valider/archiver; a pure traducteur could not.
// operateur (the merged role replacing both traducteur and relecteur, per
// the target role model) now carries REQUEST_PRIORITY_VALIDATE /
// REQUEST_VALIDATE / REQUEST_ARCHIVE — an intentional widening for
// legacy-traducteur users once they normalize to operateur, matching the
// approved Phase 1 role-unification design (prompt.md §7/§13/§59), not an
// accidental permission grant.
router.patch(
  '/:id/priorite',
  requireCapability('REQUEST_PRIORITY_VALIDATE'),
  demandesController.validerPriorite
);
router.patch('/:id/valider', requireCapability('REQUEST_VALIDATE'), demandesController.valider);
router.patch('/:id/archiver', requireCapability('REQUEST_ARCHIVE'), demandesController.archiver);

export default router;
