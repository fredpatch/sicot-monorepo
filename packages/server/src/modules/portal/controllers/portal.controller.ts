import { Request, Response } from 'express';
import fs from 'fs';
import * as portailService from '../services/portal.service.js';
import { documents } from '@/db/schema.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';

function handlePortailError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    DOCUMENT_PORTAIL_INTROUVABLE: {
      status: 404,
      message: 'Document introuvable ou non accessible.',
    },
    TOKEN_INTROUVABLE: { status: 404, message: 'Lien invalide ou inexistant.' },
    TOKEN_EXPIRE: {
      status: 410,
      message: 'Ce lien de téléchargement a expiré. Veuillez en générer un nouveau.',
    },
    DOCUMENT_INTROUVABLE: { status: 404, message: 'Document introuvable.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[portail.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/portail/documents — liste publique ───────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, categorie, page, pageSize } = req.query;
    const result = await portailService.listerDocumentsPortail({
      search: search as string | undefined,
      categorie: categorie as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    handlePortailError(res, error);
  }
}

// ── GET /api/portail/documents/:id — métadonnées document ────────────────
export async function getDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }
    const doc = await portailService.getDocumentPortail(id);
    res.json(doc);
  } catch (error) {
    handlePortailError(res, error);
  }
}

// ── GET /api/portail/documents/:id/consulter — stream inline ─────────────
// Pas de token requis pour la consultation — accès public libre
export async function consulter(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const doc = await portailService.getDocumentPortail(id);

    // Récupérer le chemin depuis la BDD
    const [docFull] = await db
      .select({ chemin: documents.chemin })
      .from(documents)
      .where(eq(documents.id, id));

    if (!docFull || !fs.existsSync(docFull.chemin)) {
      res.status(404).json({ message: 'Fichier introuvable sur le serveur.' });
      return;
    }

    // inline = visualisation dans le navigateur, pas téléchargement forcé
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.nomOriginal)}"`
    );
    fs.createReadStream(docFull.chemin).pipe(res);
  } catch (error) {
    handlePortailError(res, error);
  }
}

// ── POST /api/portail/documents/:id/token — générer lien téléchargement ──
export async function genererToken(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ message: 'Email valide requis.' });
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? 'inconnu';
    const portailToken = await portailService.genererTokenTelechargement(id, email, ip);

    res.status(201).json({
      message: `Un lien de téléchargement a été envoyé à ${email}.`,
      expiresAt: portailToken.expiresAt,
    });
  } catch (error) {
    handlePortailError(res, error);
  }
}

// ── GET /api/portail/telecharger/:token — téléchargement via token ────────
export async function telecharger(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const ip = req.ip ?? req.socket.remoteAddress ?? 'inconnu';

    const { chemin, nomOriginal, mimeType } = await portailService.validerEtConsumeToken(token, ip);

    if (!fs.existsSync(chemin)) {
      res.status(404).json({ message: 'Fichier introuvable sur le serveur.' });
      return;
    }

    // attachment = force le téléchargement
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(nomOriginal)}"`
    );
    fs.createReadStream(chemin).pipe(res);
  } catch (error) {
    handlePortailError(res, error);
  }
}

// ── PATCH /api/portail/documents/:id/visibilite — admin ──────────────────
export async function toggleVisibilite(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { visible, portailTokenDureeJours } = req.body;
    if (typeof visible !== 'boolean') {
      res.status(400).json({ message: 'Champ requis : visible (boolean).' });
      return;
    }

    await portailService.toggleVisibilitePortail(
      id,
      visible,
      portailTokenDureeJours ? parseInt(portailTokenDureeJours) : undefined,
      req.user!.userId
    );

    res.json({
      message: visible ? 'Document exposé sur le portail.' : 'Document masqué du portail.',
    });
  } catch (error) {
    handlePortailError(res, error);
  }
}
