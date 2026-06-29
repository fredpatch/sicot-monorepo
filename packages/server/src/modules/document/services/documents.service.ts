import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, ilike, or, desc, and } from 'drizzle-orm';
import { extraireTexte } from '@/utils/ocr';
import { calculerMD5 } from '@/utils/hash';
import { logAudit } from '@/modules/auth/services/auth.service';
import { DOSSIERS } from './documents.constants';
import {
  assurerDossiers,
  toDocumentView,
  genererNomFichier,
  classerAutomatiquement,
} from './documents.helpers';
import type {
  DocumentCategorie,
  DocumentFilters,
  DocumentView,
  DoublonInfo,
  UploadDocumentParams,
} from './documents.types';

export type { DocumentCategorie, DocumentFilters, DocumentView, DoublonInfo, UploadDocumentParams };

// ── Vérifier doublon par MD5 ──────────────────────────────────────────────
export async function verifierDoublon(hashMD5: string): Promise<DoublonInfo> {
  const [existant] = await db.select().from(documents).where(eq(documents.hashMD5, hashMD5));

  if (!existant) return { existe: false };

  return { existe: true, document: toDocumentView(existant) };
}

// ── Uploader et traiter un document ──────────────────────────────────────
export async function uploaderDocument(
  params: UploadDocumentParams
): Promise<{ document: DocumentView; doublon: boolean; categorieProposee: DocumentCategorie }> {
  const { buffer, nomOriginal, mimeType, categorie, uploadePar } = params;

  assurerDossiers();

  const hashMD5 = calculerMD5(buffer);
  const doublon = await verifierDoublon(hashMD5);

  let texteExtrait: string | undefined;
  let langue: string | undefined;
  let statutOCR: 'traite' | 'echec' | 'en_attente' = 'en_attente';

  try {
    const ocrResult = await extraireTexte({ buffer, nomFichier: nomOriginal, mimeType });

    if (ocrResult.succes && ocrResult.texte) {
      texteExtrait = ocrResult.texte;
      langue = ocrResult.langue;
      statutOCR = 'traite';
    } else {
      statutOCR = 'echec';
    }
  } catch (error) {
    console.warn('[documents.service] OCR échoué :', error);
    statutOCR = 'echec';
  }

  const categorieProposee = classerAutomatiquement(nomOriginal, texteExtrait);
  const categorieFinale = categorie !== 'autre' ? categorie : categorieProposee;

  const nomFichier = genererNomFichier(nomOriginal);
  const cheminFichier = path.join(DOSSIERS[categorieFinale], nomFichier);

  fs.writeFileSync(cheminFichier, buffer);

  const [document] = await db
    .insert(documents)
    .values({
      nom: nomFichier,
      nomOriginal,
      chemin: cheminFichier,
      mimeType,
      taille: buffer.length,
      categorie: categorieFinale,
      langue,
      texteExtrait,
      statutOCR,
      hashMD5,
      version: 1,
      uploadePar,
    })
    .returning();

  await logAudit({
    userId: uploadePar,
    action: 'DOCUMENT_UPLOADE',
    module: 'M8',
    entiteId: document.id,
    details: { nomOriginal, categorie: categorieFinale, statutOCR, doublon: doublon.existe },
  });

  return { document: toDocumentView(document), doublon: doublon.existe, categorieProposee };
}

// ── Lister les documents ──────────────────────────────────────────────────
export async function listerDocuments(filters: DocumentFilters): Promise<{
  data: DocumentView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(documents.nom, `%${filters.search}%`),
        ilike(documents.nomOriginal, `%${filters.search}%`),
        ilike(documents.texteExtrait, `%${filters.search}%`)
      )
    );
  }

  if (filters.categorie) {
    conditions.push(eq(documents.categorie, filters.categorie));
  }

  if (filters.statutOCR) {
    conditions.push(eq(documents.statutOCR, filters.statutOCR as never));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(documents)
    .where(where)
    .orderBy(desc(documents.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(documents, where);

  return { data: rows.map(toDocumentView), total };
}

// ── Récupérer un document par ID ──────────────────────────────────────────
export async function getDocument(id: number): Promise<DocumentView> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));

  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
  return toDocumentView(doc);
}

// ── Corriger le statut OCR manuellement ──────────────────────────────────
export async function corrigerOCR(
  id: number,
  texteCorrige: string,
  userId: number
): Promise<DocumentView> {
  const [existant] = await db.select().from(documents).where(eq(documents.id, id));

  if (!existant) throw new Error('DOCUMENT_INTROUVABLE');

  const [updated] = await db
    .update(documents)
    .set({ texteExtrait: texteCorrige, statutOCR: 'traite' })
    .where(eq(documents.id, id))
    .returning();

  await logAudit({ userId, action: 'DOCUMENT_OCR_CORRIGE', module: 'M8', entiteId: id });

  return toDocumentView(updated);
}

// ── Mettre à jour la catégorie d'un document ──────────────────────────────
export async function mettreAJourCategorie(
  id: number,
  categorie: DocumentCategorie,
  userId: number
): Promise<DocumentView> {
  const [existant] = await db.select().from(documents).where(eq(documents.id, id));

  if (!existant) throw new Error('DOCUMENT_INTROUVABLE');

  const nomFichier = path.basename(existant.chemin);
  const nouveauChemin = path.join(DOSSIERS[categorie], nomFichier);

  if (fs.existsSync(existant.chemin)) {
    fs.renameSync(existant.chemin, nouveauChemin);
  }

  const [updated] = await db
    .update(documents)
    .set({ categorie, chemin: nouveauChemin })
    .where(eq(documents.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DOCUMENT_CATEGORIE_MODIFIEE',
    module: 'M8',
    entiteId: id,
    details: { ancienneCategorie: existant.categorie, nouvelleCategorie: categorie },
  });

  return toDocumentView(updated);
}

// ── Nouvelle version d'un document existant ───────────────────────────────
export async function nouvellVersionDocument(
  parentId: number,
  params: UploadDocumentParams
): Promise<DocumentView> {
  const [parent] = await db.select().from(documents).where(eq(documents.id, parentId));

  if (!parent) throw new Error('DOCUMENT_INTROUVABLE');

  const { document } = await uploaderDocument({
    ...params,
    categorie: parent.categorie as DocumentCategorie,
  });

  const [updated] = await db
    .update(documents)
    .set({ parentId, version: parent.version + 1 })
    .where(eq(documents.id, document.id))
    .returning();

  return toDocumentView(updated);
}

// ── Récupérer le chemin d'un document pour téléchargement ───────────────
export async function getCheminDocument(
  id: number
): Promise<{ chemin: string; nomOriginal: string; mimeType: string }> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
  return { chemin: doc.chemin, nomOriginal: doc.nomOriginal, mimeType: doc.mimeType };
}
