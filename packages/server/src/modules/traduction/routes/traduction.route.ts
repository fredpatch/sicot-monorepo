import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
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
// Registre complet — réservé au personnel qui traduit. Un agent n'a jamais
// besoin de parcourir toutes les traductions, seulement la sienne (voir
// GET /:id ci-dessous, qui autorise ce cas précis).
router.get('/aggregates', requireRole('traducteur'), traductionController.aggregates);

// ── Lecture ───────────────────────────────────────────────────────────────
router.get('/', requireRole('traducteur'), traductionController.lister);
// Ouvert à tous les rôles authentifiés — le contrôleur vérifie qu'un agent
// ne peut ouvrir que la traduction liée à sa propre demande (sinon 403).
router.get('/:id', traductionController.getById);

// ── Export — même garde d'accès que GET /:id, uniquement une fois approuvée
router.get('/:id/export/pdf', traductionController.exporterPDF);
router.get('/:id/export/docx', traductionController.exporterDOCX);

// ── Suggestions glossaire pour l'éditeur ──────────────────────────────────
// Utilisé uniquement par l'atelier de traduction (réservé traducteur+).
router.get('/:id/suggestions', requireRole('traducteur'), traductionController.suggestions);

// ── Lancer une traduction — traducteur minimum ────────────────────────────
router.post('/', requireRole('traducteur'), traductionController.lancer);

// ── Workflow traduction ────────────────────────────────────────────────────
router.patch('/:id/relancer', requireRole('traducteur'), traductionController.relancer);
router.patch(
  '/:id/correction',
  requireRole('traducteur'),
  traductionController.sauvegarderCorrection
);
router.patch('/:id/approuver', requireRole('relecteur'), traductionController.approuver);
router.patch('/:id/archiver', requireRole('relecteur'), traductionController.archiver);

// ── Suppression / restauration ─────────────────────────────────────────────
router.delete('/:id', requireRole('traducteur'), traductionController.supprimer);
router.patch('/:id/restaurer', requireRole('traducteur'), traductionController.restaurer);

export default router;
