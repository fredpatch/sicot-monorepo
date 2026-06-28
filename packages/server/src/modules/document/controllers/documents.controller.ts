import { Request, Response } from 'express';
import * as documentsService from '@/modules/document/services/documents.service.js';
import { handleDocumentsError } from './documents.errors';

// ── POST /api/documents/upload ────────────────────────────────────────────
export async function upload(req: Request, res: Response): Promise<void> {
  try {
    // Multer attache le fichier à req.file
    if (!req.file) {
      res.status(400).json({ message: 'Aucun fichier fourni.' });
      return;
    }

    const { categorie } = req.body;

    const result = await documentsService.uploaderDocument({
      buffer: req.file.buffer,
      nomOriginal: req.file.originalname,
      mimeType: req.file.mimetype,
      categorie: categorie ?? 'autre',
      uploadePar: req.user!.userId,
    });

    // 207 Multi-Status si doublon détecté — succès mais avec avertissement
    const status = result.doublon ? 207 : 201;

    res.status(status).json({
      document: result.document,
      doublon: result.doublon,
      categorieProposee: result.categorieProposee,
      message: result.doublon
        ? 'Document uploadé mais un fichier identique existe déjà.'
        : 'Document uploadé avec succès.',
    });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── GET /api/documents ────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, categorie, statutOCR, page, pageSize } = req.query;

    const result = await documentsService.listerDocuments({
      search: search as string | undefined,
      categorie: categorie as documentsService.DocumentCategorie | undefined,
      statutOCR: statutOCR as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── GET /api/documents/:id ────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const document = await documentsService.getDocument(id);
    res.json(document);
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── PATCH /api/documents/:id/ocr ──────────────────────────────────────────
export async function corrigerOCR(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { texte } = req.body;
    if (!texte || typeof texte !== 'string') {
      res.status(400).json({ message: 'Texte corrigé requis.' });
      return;
    }

    const document = await documentsService.corrigerOCR(id, texte, req.user!.userId);

    res.json({ document, message: 'Texte OCR corrigé avec succès.' });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── PATCH /api/documents/:id/categorie ───────────────────────────────────
export async function mettreAJourCategorie(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { categorie } = req.body;
    const categoriesValides = [
      'accord',
      'correspondance',
      'mission',
      'traduction',
      'glossaire',
      'autre',
    ];

    if (!categorie || !categoriesValides.includes(categorie)) {
      res.status(400).json({ message: 'Catégorie invalide.' });
      return;
    }

    const document = await documentsService.mettreAJourCategorie(id, categorie, req.user!.userId);

    res.json({ document, message: 'Catégorie mise à jour.' });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── POST /api/documents/:id/nouvelle-version ──────────────────────────────
export async function nouvelleVersion(req: Request, res: Response): Promise<void> {
  try {
    const parentId = parseInt(req.params.id);
    if (isNaN(parentId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'Aucun fichier fourni.' });
      return;
    }

    const document = await documentsService.nouvellVersionDocument(parentId, {
      buffer: req.file.buffer,
      nomOriginal: req.file.originalname,
      mimeType: req.file.mimetype,
      categorie: 'autre',
      uploadePar: req.user!.userId,
    });

    res.status(201).json({
      document,
      message: `Version ${document.version} créée avec succès.`,
    });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── GET /api/documents/doublon ────────────────────────────────────────────
// Vérifier si un hash MD5 existe déjà avant l'upload
export async function verifierDoublon(req: Request, res: Response): Promise<void> {
  try {
    const { hash } = req.query;

    if (!hash || typeof hash !== 'string') {
      res.status(400).json({ message: 'Hash MD5 requis.' });
      return;
    }

    const result = await documentsService.verifierDoublon(hash);
    res.json(result);
  } catch (error) {
    handleDocumentsError(res, error);
  }
}
