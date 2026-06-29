import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireRole } from '@/middleware/requiredRole.js';
import { upload, handleMulterError } from '@/middleware/upload.js';
import * as documentsController from '@/modules/document/controllers/documents.controller.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Vérification doublon (avant upload) ───────────────────────────────────
// ⚠️  Déclaré avant /:id pour éviter que "doublon" soit capturé comme un ID
router.get('/doublon', documentsController.verifierDoublon);

// ── Lecture ───────────────────────────────────────────────────────────────
router.get('/', documentsController.lister);
router.get('/:id', documentsController.getById);

// ── Upload ────────────────────────────────────────────────────────────────
router.post(
  '/upload',
  upload.single('file'),
  handleMulterError as never,
  documentsController.upload
);

// ── Nouvelle version ──────────────────────────────────────────────────────
router.post(
  '/:id/nouvelle-version',
  upload.single('file'),
  handleMulterError as never,
  documentsController.nouvelleVersion
);

// ── Modifications — traducteur minimum ───────────────────────────────────
router.patch('/:id/ocr', requireRole('traducteur'), documentsController.corrigerOCR);
router.patch('/:id/categorie', requireRole('traducteur'), documentsController.mettreAJourCategorie);

// ── Téléchargement ───────────────────────────────────────────────────────
router.get('/:id/telecharger', documentsController.telecharger);

// ── Suppression / restauration / retraitement OCR ─────────────────────────
router.delete('/:id', requireRole('traducteur'), documentsController.supprimer);
router.patch('/:id/restaurer', requireRole('traducteur'), documentsController.restaurer);
router.post('/:id/retraiter-ocr', requireRole('traducteur'), documentsController.retraiterOCR);

export default router;
