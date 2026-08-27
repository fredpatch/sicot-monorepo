import { Request, Response } from 'express';
import * as documentsService from '@/modules/document/services/documents.service.js';
import { handleDocumentsError } from './documents.errors';
import fs from 'fs';
import { hasCapability, UserRole } from '@sicot/shared';

// ── Portée personnelle — dérivée de la capacité, pas du rôle ───────────────
// Quiconque n'a pas DOCUMENT_UPLOAD (le signal "accès bibliothèque
// générale", operateur+) ne voit que les documents visibles en interne +
// ceux qu'il a lui-même uploadés (Phase 4.7, même principe que
// documents.service.ts:verifierAccesDocument).
function aSeulementSesPropresDocuments(req: Request): boolean {
  return !hasCapability(req.user!.role as UserRole, 'DOCUMENT_UPLOAD');
}

// ── POST /api/documents/upload ────────────────────────────────────────────
export async function upload(req: Request, res: Response): Promise<void> {
  try {
    // Multer attache le fichier à req.file
    if (!req.file) {
      res.status(400).json({ message: 'Aucun fichier fourni.' });
      return;
    }

    const { categorie, visibiliteInterne } = req.body;
    // POST /upload n'a délibérément aucune garde de capacité — audité en
    // Phase 4.7 : ce même endpoint sert à la fois l'upload de bibliothèque
    // générale (page Documents, operateur+ côté UI) ET les workflows
    // personnels (pièce jointe d'une demande de traduction, rapport de
    // mission), où un agent doit pouvoir déposer son propre fichier. Le
    // scoping se fait après coup, pas à la porte : un agent ne peut jamais
    // rendre son upload visible en interne (visibiliteInterne forcé à
    // false), donc le document reste privé (visible seulement par lui-même
    // et par quiconque a DOCUMENT_UPLOAD) jusqu'à ce qu'un opérateur+ le
    // rende visible via DOCUMENT_INTERNAL_VISIBILITY_MANAGE. Voir le rapport
    // de phase pour la distinction complète upload-personnel vs
    // gestion-de-bibliothèque.
    const aSeulementLaPorteePersonnelle = !hasCapability(req.user!.role as UserRole, 'DOCUMENT_UPLOAD');

    const result = await documentsService.uploaderDocument({
      buffer: req.file.buffer,
      nomOriginal: req.file.originalname,
      mimeType: req.file.mimetype,
      categorie: categorie ?? 'autre',
      uploadePar: req.user!.userId,
      visibiliteInterne: !aSeulementLaPorteePersonnelle && visibiliteInterne === '1',
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
// Sans DOCUMENT_UPLOAD (portée personnelle uniquement), on ne voit que les
// documents visibles en interne + ceux qu'on a soi-même uploadés ;
// operateur+ voit tout, comme aujourd'hui.
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, categorie, statutOCR, page, pageSize, finalesUniquement } = req.query;

    const result = await documentsService.listerDocuments({
      search: search as string | undefined,
      categorie: categorie as documentsService.DocumentCategorie | undefined,
      statutOCR: statutOCR as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      finalesUniquement: finalesUniquement === '1',
      visibleOuUploadePar: aSeulementSesPropresDocuments(req) ? req.user!.userId : undefined,
    });

    res.json(result);
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── GET /api/documents/aggregates ─────────────────────────────────────────
export async function aggregates(req: Request, res: Response): Promise<void> {
  try {
    const result = await documentsService.getDocumentsAggregates(
      aSeulementSesPropresDocuments(req) ? req.user!.userId : undefined
    );
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

    await documentsService.verifierAccesDocument(id, {
      role: req.user!.role,
      userId: req.user!.userId,
    });

    const document = await documentsService.getDocument(id);
    res.json(document);
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── PATCH /api/documents/:id/visibilite-interne ───────────────────────────
export async function toggleVisibiliteInterne(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { visible } = req.body;
    if (typeof visible !== 'boolean') {
      res.status(400).json({ message: 'Champ "visible" booléen requis.' });
      return;
    }

    const document = await documentsService.toggleVisibiliteInterne(id, visible, req.user!.userId);
    res.json({
      document,
      message: visible ? 'Document rendu visible en interne.' : 'Document masqué en interne.',
    });
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
      'rapport',
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

    const { categorie } = req.body;
    const categoriesValides = [
      'accord',
      'correspondance',
      'mission',
      'traduction',
      'glossaire',
      'rapport',
      'autre',
    ];
    const categorieOverride =
      categorie && categoriesValides.includes(categorie)
        ? (categorie as documentsService.DocumentCategorie)
        : undefined;

    const document = await documentsService.nouvellVersionDocument(
      parentId,
      {
        buffer: req.file.buffer,
        nomOriginal: req.file.originalname,
        mimeType: req.file.mimetype,
        categorie: 'autre',
        uploadePar: req.user!.userId,
      },
      categorieOverride
    );

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

// ── GET /api/documents/:id/telecharger ───────────────────────────────────────
export async function telecharger(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    await documentsService.verifierAccesDocument(id, {
      role: req.user!.role,
      userId: req.user!.userId,
    });

    const { chemin, nomOriginal, mimeType } = await documentsService.getCheminDocument(id);

    if (!fs.existsSync(chemin)) {
      res.status(404).json({ message: 'Fichier introuvable sur le serveur.' });
      return;
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nomOriginal)}"`);
    fs.createReadStream(chemin).pipe(res);
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── DELETE /api/documents/:id ─────────────────────────────────────────────
export async function supprimer(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const document = await documentsService.supprimerDocument(id, req.user!.userId);
    res.json({ document, message: 'Document supprimé (corbeille).' });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── PATCH /api/documents/:id/restaurer ───────────────────────────────────
export async function restaurer(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const document = await documentsService.restaurerDocument(id, req.user!.userId);
    res.json({ document, message: 'Document restauré.' });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}

// ── POST /api/documents/:id/retraiter-ocr ────────────────────────────────
export async function retraiterOCR(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const document = await documentsService.retraiterOCR(id, req.user!.userId);
    res.json({
      document,
      message:
        document.statutOCR === 'traite'
          ? 'OCR retraité avec succès.'
          : 'OCR retraité — extraction partielle ou échec.',
    });
  } catch (error) {
    handleDocumentsError(res, error);
  }
}
