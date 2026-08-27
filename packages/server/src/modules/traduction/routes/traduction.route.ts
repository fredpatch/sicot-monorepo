import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability, requireAllCapabilities } from '@/middleware/requireCapability';
import * as traductionController from '../controllers/traduction.controller';

const router = Router();

router.use(authenticate);

// ── Timeout 3 minutes pour les traductions longues ────────────────────────
router.use((req, res, next) => {
  res.setTimeout(450000); // 7.5 minutes pour les gros documents
  next();
});

// ── Routes spéciales — avant /:id ─────────────────────────────────────────
router.get('/moteur/status', traductionController.moteurStatus);
// Registre complet — réservé à qui a TRANSLATION_VIEW (l'atelier de
// traduction opérationnel). Quelqu'un avec seulement la portée personnelle
// n'a jamais besoin de parcourir tout le registre, seulement la sienne
// (voir GET /:id ci-dessous, qui autorise ce cas précis via la relation à
// sa demande).
router.get('/aggregates', requireCapability('TRANSLATION_VIEW'), traductionController.aggregates);

// ── Lecture ───────────────────────────────────────────────────────────────
router.get('/', requireCapability('TRANSLATION_VIEW'), traductionController.lister);
// Ouvert à tous les rôles authentifiés — le contrôleur (verifierAcces)
// dérive l'accès de la relation demandeur↔traduction pour qui n'a pas
// TRANSLATION_VIEW, jamais du nom du rôle (Phase 4.6).
router.get('/:id', traductionController.getById);

// ── Export — même garde d'accès que GET /:id, uniquement une fois approuvée
router.get('/:id/export/pdf', traductionController.exporterPDF);
router.get('/:id/export/docx', traductionController.exporterDOCX);

// ── Suggestions glossaire pour l'éditeur ──────────────────────────────────
// Utilisé uniquement par l'atelier de traduction (réservé TRANSLATION_VIEW).
router.get('/:id/suggestions', requireCapability('TRANSLATION_VIEW'), traductionController.suggestions);

// ── Lancer une traduction — TRANSLATION_PROCESS ────────────────────────────
router.post('/', requireCapability('TRANSLATION_PROCESS'), traductionController.lancer);

// ── Workflow traduction ────────────────────────────────────────────────────
router.patch('/:id/relancer', requireCapability('TRANSLATION_PROCESS'), traductionController.relancer);
router.patch(
  '/:id/correction',
  requireCapability('TRANSLATION_PROCESS'),
  traductionController.sauvegarderCorrection
);
// Approuver combine relecture et approbation — les deux capacités sont
// exigées plutôt qu'une seule pour rester fidèle à la sémantique "review +
// approve", même si aujourd'hui les deux sont accordées ensemble à
// operateur+ (aucune différence de comportement observable).
router.patch(
  '/:id/approuver',
  requireAllCapabilities('TRANSLATION_REVIEW', 'TRANSLATION_APPROVE'),
  traductionController.approuver
);
router.patch('/:id/archiver', requireCapability('TRANSLATION_ARCHIVE'), traductionController.archiver);

// ── Suppression / restauration ─────────────────────────────────────────────
// Pas de capacité TRANSLATION_DELETE dédiée dans le modèle approuvé en
// Phase 2 (§6 : éviter la prolifération de micro-capacités) — supprimer/
// restaurer un enregistrement de traduction relève de la même gestion
// opérationnelle que TRANSLATION_PROCESS, avec le même ensemble de rôles
// qu'auparavant (traducteur minimum → operateur+).
router.delete('/:id', requireCapability('TRANSLATION_PROCESS'), traductionController.supprimer);
router.patch('/:id/restaurer', requireCapability('TRANSLATION_PROCESS'), traductionController.restaurer);

export default router;
