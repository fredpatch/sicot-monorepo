import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { requireCapability } from '@/middleware/requireCapability.js';
import { upload, handleMulterError } from '@/middleware/upload.js';
import * as documentsController from '@/modules/document/controllers/documents.controller.js';

const router = Router();

// Toutes les routes nécessitent d'être connecté
router.use(authenticate);

// ── Vérification doublon (avant upload) ───────────────────────────────────
// ⚠️  Déclaré avant /:id pour éviter que "doublon" soit capturé comme un ID
router.get('/doublon', documentsController.verifierDoublon);

// ── Lecture ───────────────────────────────────────────────────────────────
// ⚠️  Déclaré avant /:id pour éviter que "aggregates" soit capturé comme un ID
// Portée personnelle appliquée dans le controller pour qui n'a pas
// DOCUMENT_UPLOAD (voir documents.controller.ts aSeulementSesPropresDocuments).
router.get('/aggregates', documentsController.aggregates);
router.get('/', documentsController.lister);
router.get('/:id', documentsController.getById);

// ── Upload ────────────────────────────────────────────────────────────────
// Délibérément SANS garde de capacité — voir le commentaire détaillé dans
// documents.controller.ts:upload. Ce endpoint sert à la fois la bibliothèque
// documentaire générale ET les workflows personnels (pièce jointe de
// demande/mission), où un agent doit pouvoir uploader son propre fichier.
// Le scoping réel se fait via visibiliteInterne (forcé à false hors
// DOCUMENT_UPLOAD) + verifierAccesDocument, pas à la porte de la route.
router.post(
  '/upload',
  upload.single('file'),
  handleMulterError as never,
  documentsController.upload
);

// ── Nouvelle version — DOCUMENT_UPLOAD ─────────────────────────────────────
router.post(
  '/:id/nouvelle-version',
  requireCapability('DOCUMENT_UPLOAD'),
  upload.single('file'),
  handleMulterError as never,
  documentsController.nouvelleVersion
);

// ── Modifications — capacités documentaires dédiées ────────────────────────
router.patch('/:id/ocr', requireCapability('DOCUMENT_OCR_MANAGE'), documentsController.corrigerOCR);
router.patch(
  '/:id/categorie',
  requireCapability('DOCUMENT_CATEGORY_MANAGE'),
  documentsController.mettreAJourCategorie
);
router.patch(
  '/:id/visibilite-interne',
  requireCapability('DOCUMENT_INTERNAL_VISIBILITY_MANAGE'),
  documentsController.toggleVisibiliteInterne
);

// ── Téléchargement ───────────────────────────────────────────────────────
router.get('/:id/telecharger', documentsController.telecharger);

// ── Suppression / restauration / retraitement OCR ─────────────────────────
// Pas de capacité DOCUMENT_RESTORE dédiée (§6 : éviter la prolifération) —
// restaurer réutilise DOCUMENT_DELETE, même principe que le module Traduction.
router.delete('/:id', requireCapability('DOCUMENT_DELETE'), documentsController.supprimer);
router.patch('/:id/restaurer', requireCapability('DOCUMENT_DELETE'), documentsController.restaurer);
router.post(
  '/:id/retraiter-ocr',
  requireCapability('DOCUMENT_OCR_MANAGE'),
  documentsController.retraiterOCR
);

export default router;
