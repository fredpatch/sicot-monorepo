import { db } from '@/db/index';
import { documents, portailTokens } from '@/db/schema';
import { eq, and, isNull, ilike, or, desc, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logAudit } from '@/modules/auth/services/auth.service';
import { sendNotificationManuelle } from '@/utils/email';

// ── Types ──────────────────────────────────────────────────────────────────
export interface DocumentPortailView {
  id: number;
  nomOriginal: string;
  categorie: string;
  langue?: string;
  taille: number;
  mimeType: string;
  portailTokenDureeJours?: number;
  createdAt: Date;
}

export interface PortailTokenView {
  id: number;
  documentId: number;
  email: string;
  token: string;
  expiresAt?: Date;
  utiliseLe?: Date;
  createdAt: Date;
}

// ── SERVICE : Lister les documents exposés (browse public) ────────────────
export async function listerDocumentsPortail(filters: {
  search?: string;
  categorie?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: DocumentPortailView[]; total: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(documents.visibilitePortail, true),
    isNull(documents.deletedAt),
    eq(documents.statutOCR, 'traite'), // seuls les docs OCR traité sont exposés
  ];

  if (filters.search) {
    conditions.push(
      or(
        ilike(documents.nomOriginal, `%${filters.search}%`),
        ilike(documents.texteExtrait, `%${filters.search}%`)
      )!
    );
  }

  if (filters.categorie) {
    conditions.push(eq(documents.categorie, filters.categorie as never));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      id: documents.id,
      nomOriginal: documents.nomOriginal,
      categorie: documents.categorie,
      langue: documents.langue,
      taille: documents.taille,
      mimeType: documents.mimeType,
      portailTokenDureeJours: documents.portailTokenDureeJours,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(where)
    .orderBy(desc(documents.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(documents, where);

  return {
    data: rows.map((r) => ({
      ...r,
      langue: r.langue ?? undefined,
      portailTokenDureeJours: r.portailTokenDureeJours ?? undefined,
    })),
    total,
  };
}

// ── SERVICE : Récupérer métadonnées d'un document exposé ──────────────────
export async function getDocumentPortail(id: number): Promise<DocumentPortailView> {
  const [doc] = await db
    .select({
      id: documents.id,
      nomOriginal: documents.nomOriginal,
      categorie: documents.categorie,
      langue: documents.langue,
      taille: documents.taille,
      mimeType: documents.mimeType,
      portailTokenDureeJours: documents.portailTokenDureeJours,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.visibilitePortail, true),
        isNull(documents.deletedAt),
        eq(documents.statutOCR, 'traite')
      )
    );

  if (!doc) throw new Error('DOCUMENT_PORTAIL_INTROUVABLE');

  return {
    ...doc,
    langue: doc.langue ?? undefined,
    portailTokenDureeJours: doc.portailTokenDureeJours ?? undefined,
  };
}

// ── SERVICE : Générer un token de téléchargement ──────────────────────────
export async function genererTokenTelechargement(
  documentId: number,
  email: string,
  ip: string
): Promise<PortailTokenView> {
  // Vérifier que le document est bien exposé
  const doc = await getDocumentPortail(documentId);

  // Calculer expiration selon la durée configurée sur le document
  let expiresAt: Date | undefined;
  if (doc.portailTokenDureeJours) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + doc.portailTokenDureeJours);
  }

  const token = randomUUID();

  const [portailToken] = await db
    .insert(portailTokens)
    .values({
      documentId,
      email: email.toLowerCase().trim(),
      token,
      expiresAt,
      ipUtilisateur: ip,
    })
    .returning();

  // Envoyer l'email avec le lien de téléchargement
  const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
  const lienPortail = `${baseUrl}/portal/telecharger/${token}`;

  await sendNotificationManuelle({
    to: email,
    objet: `Votre lien de téléchargement - ${doc.nomOriginal}`,
    message:
      `Vous avez demandé le téléchargement du document "${doc.nomOriginal}".\n\n` +
      `Cliquez sur le lien suivant pour télécharger le document :\n${lienPortail}\n\n` +
      (expiresAt
        ? `Ce lien est valable jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}.`
        : `Ce lien est valable sans limitation de durée.`) +
      `\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n` +
      `- ANAC Gabon, Cellule de Coopération Internationale et de Traduction`,
  });

  // Log audit pour traçabilité
  await logAudit({
    action: 'PORTAIL_TOKEN_GENERE',
    module: 'PORTAIL',
    entiteId: documentId,
    details: { email, expiresAt, ip },
  });

  return {
    id: portailToken.id,
    documentId: portailToken.documentId,
    email: portailToken.email,
    token: portailToken.token,
    expiresAt: portailToken.expiresAt ?? undefined,
    utiliseLe: portailToken.utiliseLe ?? undefined,
    createdAt: portailToken.createdAt,
  };
}

// ── SERVICE : Valider et consommer un token de téléchargement ─────────────
export async function validerEtConsumeToken(
  token: string,
  ip: string
): Promise<{ chemin: string; nomOriginal: string; mimeType: string }> {
  const [portailToken] = await db
    .select()
    .from(portailTokens)
    .where(eq(portailTokens.token, token));

  if (!portailToken) throw new Error('TOKEN_INTROUVABLE');

  // Vérifier expiration
  if (portailToken.expiresAt && new Date(portailToken.expiresAt) < new Date()) {
    throw new Error('TOKEN_EXPIRE');
  }

  // Récupérer le document
  const [doc] = await db
    .select({
      chemin: documents.chemin,
      nomOriginal: documents.nomOriginal,
      mimeType: documents.mimeType,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, portailToken.documentId),
        eq(documents.visibilitePortail, true),
        isNull(documents.deletedAt)
      )
    );

  if (!doc) throw new Error('DOCUMENT_PORTAIL_INTROUVABLE');

  // Marquer le token comme utilisé
  await db
    .update(portailTokens)
    .set({ utiliseLe: new Date(), ipUtilisateur: ip })
    .where(eq(portailTokens.id, portailToken.id));

  await logAudit({
    action: 'PORTAIL_DOCUMENT_TELECHARGE',
    module: 'PORTAIL',
    entiteId: portailToken.documentId,
    details: { email: portailToken.email, token, ip },
  });

  return doc;
}

// ── SERVICE : Exposer/masquer un document (admin) ─────────────────────────
export async function toggleVisibilitePortail(
  id: number,
  visible: boolean,
  portailTokenDureeJours?: number,
  userId: number = 0
): Promise<void> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');

  await db
    .update(documents)
    .set({
      visibilitePortail: visible,
      portailTokenDureeJours: visible ? (portailTokenDureeJours ?? null) : null,
    })
    .where(eq(documents.id, id));

  await logAudit({
    userId,
    action: visible ? 'DOCUMENT_EXPOSE_PORTAIL' : 'DOCUMENT_MASQUE_PORTAIL',
    module: 'PORTAIL',
    entiteId: id,
    details: { portailTokenDureeJours },
  });
}

// ── SERVICE : Stats téléchargements (pour M11 Analytics) ─────────────────
export async function getStatsTelechargements(documentId: number): Promise<{
  totalTelechargements: number;
  emailsUniques: number;
  dernierAcces?: Date;
}> {
  const rows = await db
    .select({
      email: portailTokens.email,
      utiliseLe: portailTokens.utiliseLe,
    })
    .from(portailTokens)
    .where(and(eq(portailTokens.documentId, documentId), isNotNull(portailTokens.utiliseLe)));

  const emailsUniques = new Set(rows.map((r) => r.email)).size;
  const dates = rows.map((r) => r.utiliseLe!).filter(Boolean);
  const dernierAcces =
    dates.length > 0 ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))) : undefined;

  return {
    totalTelechargements: rows.length,
    emailsUniques,
    dernierAcces,
  };
}
