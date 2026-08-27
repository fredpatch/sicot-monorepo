import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, ilike, or, desc, and, isNull, isNotNull, notInArray } from 'drizzle-orm';
import { extraireTexte } from '@/utils/ocr';
import { calculerMD5 } from '@/utils/hash';
import { logAudit } from '@/modules/auth/services/auth.service';
import { hasCapability, UserRole } from '@sicot/shared';
import { DOSSIERS } from './documents.constants';
import {
  assurerDossiers,
  toDocumentView,
  toDocumentListView,
  genererNomFichier,
  classerAutomatiquement,
} from './documents.helpers';
import type {
  DocumentCategorie,
  DocumentFilters,
  DocumentListView,
  DocumentsAggregates,
  DocumentView,
  DoublonInfo,
  UploadDocumentParams,
} from './documents.types';

export type {
  DocumentCategorie,
  DocumentFilters,
  DocumentListView,
  DocumentsAggregates,
  DocumentView,
  DoublonInfo,
  UploadDocumentParams,
};

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
  const { buffer, nomOriginal, mimeType, categorie, uploadePar, visibiliteInterne } = params;

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
      visibiliteInterne: visibiliteInterne ?? false,
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
// Projection allégée (sans texteExtrait/chemin) — potentiellement volumineux
// et non nécessaire pour l'affichage en registre ; le détail complet reste
// disponible via getDocument(id). Voir DocumentListView.
export async function listerDocuments(filters: DocumentFilters): Promise<{
  data: DocumentListView[];
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

  // Dans listerDocuments, ajouter dans les conditions :
  if (!filters.avecSupprimes) {
    conditions.push(isNull(documents.deletedAt));
  }

  // Rôle agent uniquement (voir DocumentFilters#visibleOuUploadePar) — ne
  // voit que ce qui est publié en interne, plus ses propres uploads même
  // avant publication.
  if (filters.visibleOuUploadePar !== undefined) {
    conditions.push(
      or(
        eq(documents.visibiliteInterne, true),
        eq(documents.uploadePar, filters.visibleOuUploadePar)
      )!
    );
  }

  // Ne garder que les lignes qu'aucune autre ligne ne référence via
  // parentId — résolu en IDs candidats plutôt qu'un NOT EXISTS, cohérent
  // avec le reste du module (ex. recherche demandeur/document dans
  // demandes.service.ts).
  if (filters.finalesUniquement) {
    const parents = await db
      .selectDistinct({ parentId: documents.parentId })
      .from(documents)
      .where(isNotNull(documents.parentId));
    const parentIds = parents
      .map((p) => p.parentId)
      .filter((id): id is number => id !== null);
    if (parentIds.length > 0) {
      conditions.push(notInArray(documents.id, parentIds));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: documents.id,
      nom: documents.nom,
      nomOriginal: documents.nomOriginal,
      mimeType: documents.mimeType,
      taille: documents.taille,
      categorie: documents.categorie,
      langue: documents.langue,
      statutOCR: documents.statutOCR,
      hashMD5: documents.hashMD5,
      version: documents.version,
      parentId: documents.parentId,
      uploadePar: documents.uploadePar,
      createdAt: documents.createdAt,
      visibilitePortail: documents.visibilitePortail,
      portailTokenDureeJours: documents.portailTokenDureeJours,
      visibiliteInterne: documents.visibiliteInterne,
    })
    .from(documents)
    .where(where)
    .orderBy(desc(documents.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(documents, where);

  return { data: rows.map(toDocumentListView), total };
}

// ── Agrégats globaux ────────────────────────────────────────────────────
// Même portée que listerDocuments (agent restreint à visibleOuUploadePar) —
// des compteurs cohérents avec ce que ce rôle peut effectivement lister,
// jamais calculés sur la page courante.
export async function getDocumentsAggregates(
  visibleOuUploadePar?: number
): Promise<DocumentsAggregates> {
  const base = [isNull(documents.deletedAt)];
  if (visibleOuUploadePar !== undefined) {
    base.push(
      or(
        eq(documents.visibiliteInterne, true),
        eq(documents.uploadePar, visibleOuUploadePar)
      )!
    );
  }
  const where = and(...base);

  const [total, ocrTraites, ocrEnAttente, ocrEchecs, portailExposes, categorieRows] =
    await Promise.all([
      db.$count(documents, where),
      db.$count(documents, and(where, eq(documents.statutOCR, 'traite'))),
      db.$count(
        documents,
        and(
          where,
          or(eq(documents.statutOCR, 'en_attente'), eq(documents.statutOCR, 'a_retraiter'))
        )
      ),
      db.$count(documents, and(where, eq(documents.statutOCR, 'echec'))),
      db.$count(documents, and(where, eq(documents.visibilitePortail, true))),
      db.selectDistinct({ categorie: documents.categorie }).from(documents).where(where),
    ]);

  return {
    total,
    ocrTraites,
    ocrEnAttente,
    ocrEchecs,
    categories: categorieRows.length,
    portailExposes,
  };
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
// Hérite de la catégorie du parent par défaut (cas générique : remplacer un
// fichier par une version mise à jour du même type de document), sauf si
// categorieOverride est fourni — ex. déposer une traduction officielle
// reformatée depuis l'atelier de traduction, qui doit être classée
// 'traduction' indépendamment de la catégorie du document source original.
export async function nouvellVersionDocument(
  parentId: number,
  params: UploadDocumentParams,
  categorieOverride?: DocumentCategorie
): Promise<DocumentView> {
  const [parent] = await db.select().from(documents).where(eq(documents.id, parentId));

  if (!parent) throw new Error('DOCUMENT_INTROUVABLE');

  // Une traduction déposée est automatiquement visible en interne, même si
  // le document source ne l'était pas — c'est la règle métier convenue
  // (« traduit ⇒ partagé »). Toute autre nouvelle version hérite de la
  // visibilité actuelle du parent, comme sa catégorie.
  const visibiliteInterne =
    categorieOverride === 'traduction' ? true : parent.visibiliteInterne;

  const { document } = await uploaderDocument({
    ...params,
    categorie: categorieOverride ?? (parent.categorie as DocumentCategorie),
    visibiliteInterne,
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

// ── Basculer la visibilité interne (agent) ────────────────────────────────
// Distincte de visibilitePortail (public). operateur+ uniquement (voir la
// route) — décision moins engageante que la publication externe, donc pas
// réservée admin comme le portail.
export async function toggleVisibiliteInterne(
  id: number,
  visible: boolean,
  userId: number
): Promise<DocumentView> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');

  const [updated] = await db
    .update(documents)
    .set({ visibiliteInterne: visible })
    .where(eq(documents.id, id))
    .returning();

  await logAudit({
    userId,
    action: visible ? 'DOCUMENT_VISIBLE_INTERNE' : 'DOCUMENT_MASQUE_INTERNE',
    module: 'M8',
    entiteId: id,
  });

  return toDocumentView(updated);
}

// ── Vérifier qu'un utilisateur a le droit de voir/télécharger un document
// donné (GET /:id, GET /:id/telecharger) — quiconque a DOCUMENT_UPLOAD (le
// signal "accès bibliothèque générale", operateur+) n'est jamais restreint
// ici ; seule la portée personnelle (aujourd'hui : agent) est concernée
// (voir listerDocuments#visibleOuUploadePar pour la même règle appliquée au
// listing). Dérivé de la capacité plutôt que du littéral de rôle 'agent'
// (Phase 4.7). ───────────────────────────────────────────────────────────
export async function verifierAccesDocument(
  id: number,
  utilisateur: { role: string; userId: number }
): Promise<void> {
  if (hasCapability(utilisateur.role as UserRole, 'DOCUMENT_UPLOAD')) return;

  const [doc] = await db
    .select({ visibiliteInterne: documents.visibiliteInterne, uploadePar: documents.uploadePar })
    .from(documents)
    .where(eq(documents.id, id));

  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
  if (!doc.visibiliteInterne && doc.uploadePar !== utilisateur.userId) {
    throw new Error('DOCUMENT_NON_AUTORISE');
  }
}

// ── Soft delete ───────────────────────────────────────────────────────────
export async function supprimerDocument(id: number, userId: number): Promise<DocumentView> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));

  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
  if (doc.deletedAt) throw new Error('DOCUMENT_DEJA_SUPPRIME');

  const [updated] = await db
    .update(documents)
    .set({ deletedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DOCUMENT_SUPPRIME',
    module: 'M8',
    entiteId: id,
    details: { nomOriginal: doc.nomOriginal },
  });

  return toDocumentView(updated);
}

// ── Restaurer un document supprimé ────────────────────────────────────────
export async function restaurerDocument(id: number, userId: number): Promise<DocumentView> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));

  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
  if (!doc.deletedAt) throw new Error('DOCUMENT_NON_SUPPRIME');

  const [updated] = await db
    .update(documents)
    .set({ deletedAt: null })
    .where(eq(documents.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DOCUMENT_RESTAURE',
    module: 'M8',
    entiteId: id,
    details: { nomOriginal: doc.nomOriginal },
  });

  return toDocumentView(updated);
}

// ── Relancer OCR sur un document existant ─────────────────────────────────
export async function retraiterOCR(id: number, userId: number): Promise<DocumentView> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));

  if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
  if (doc.deletedAt) throw new Error('DOCUMENT_SUPPRIME');

  // Vérifier que le fichier physique existe encore
  if (!fs.existsSync(doc.chemin)) {
    throw new Error('FICHIER_INTROUVABLE');
  }

  // Relire le fichier depuis le disque
  const buffer = fs.readFileSync(doc.chemin);

  // Marquer en cours de retraitement
  await db.update(documents).set({ statutOCR: 'en_attente' }).where(eq(documents.id, id));

  let texteExtrait: string | undefined;
  let langue: string | undefined;
  let statutOCR: 'traite' | 'echec' | 'en_attente' = 'en_attente';

  try {
    const ocrResult = await extraireTexte({
      buffer,
      nomFichier: doc.nomOriginal,
      mimeType: doc.mimeType,
    });

    if (ocrResult.succes && ocrResult.texte) {
      texteExtrait = ocrResult.texte;
      langue = ocrResult.langue;
      statutOCR = 'traite';
    } else {
      statutOCR = 'echec';
    }
  } catch (error) {
    console.warn('[documents.service] Retraitement OCR échoué:', error);
    statutOCR = 'echec';
  }

  const [updated] = await db
    .update(documents)
    .set({
      texteExtrait: texteExtrait ?? doc.texteExtrait,
      langue: langue ?? doc.langue,
      statutOCR,
    })
    .where(eq(documents.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DOCUMENT_OCR_RETRAITE',
    module: 'M8',
    entiteId: id,
    details: { statutOCR, nomOriginal: doc.nomOriginal },
  });

  return toDocumentView(updated);
}
