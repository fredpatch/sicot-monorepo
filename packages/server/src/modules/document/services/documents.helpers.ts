import fs from 'fs';
import path from 'path';
import { documents } from '@/db/schema';
import { DOSSIERS, MOTS_CLES_CATEGORIES } from './documents.constants';
import type { DocumentCategorie, DocumentListView, DocumentView } from './documents.types';

export function assurerDossiers(): void {
  Object.values(DOSSIERS).forEach((dossier) => {
    if (!fs.existsSync(dossier)) {
      fs.mkdirSync(dossier, { recursive: true });
    }
  });
}

export function toDocumentView(doc: typeof documents.$inferSelect): DocumentView {
  return {
    id: doc.id,
    nom: doc.nom,
    nomOriginal: doc.nomOriginal,
    chemin: doc.chemin,
    mimeType: doc.mimeType,
    taille: doc.taille,
    categorie: doc.categorie as DocumentCategorie,
    langue: doc.langue ?? undefined,
    texteExtrait: doc.texteExtrait ?? undefined,
    statutOCR: doc.statutOCR,
    hashMD5: doc.hashMD5,
    version: doc.version,
    parentId: doc.parentId ?? undefined,
    uploadePar: doc.uploadePar,
    createdAt: doc.createdAt,
    visibilitePortail: doc.visibilitePortail,
    portailTokenDureeJours: doc.portailTokenDureeJours ?? undefined,
    visibiliteInterne: doc.visibiliteInterne,
  };
}

// Ligne de listing - colonnes exactes de la projection utilisée par
// listerDocuments (sans texteExtrait/chemin, voir DocumentListView).
type DocumentListRow = Pick<
  typeof documents.$inferSelect,
  | 'id'
  | 'nom'
  | 'nomOriginal'
  | 'mimeType'
  | 'taille'
  | 'categorie'
  | 'langue'
  | 'statutOCR'
  | 'hashMD5'
  | 'version'
  | 'parentId'
  | 'uploadePar'
  | 'createdAt'
  | 'visibilitePortail'
  | 'portailTokenDureeJours'
  | 'visibiliteInterne'
>;

export function toDocumentListView(doc: DocumentListRow): DocumentListView {
  return {
    id: doc.id,
    nom: doc.nom,
    nomOriginal: doc.nomOriginal,
    mimeType: doc.mimeType,
    taille: doc.taille,
    categorie: doc.categorie as DocumentCategorie,
    langue: doc.langue ?? undefined,
    statutOCR: doc.statutOCR,
    hashMD5: doc.hashMD5,
    version: doc.version,
    parentId: doc.parentId ?? undefined,
    uploadePar: doc.uploadePar,
    createdAt: doc.createdAt,
    visibilitePortail: doc.visibilitePortail,
    portailTokenDureeJours: doc.portailTokenDureeJours ?? undefined,
    visibiliteInterne: doc.visibiliteInterne,
  };
}

// Générer un nom de fichier unique avec timestamp
export function genererNomFichier(nomOriginal: string): string {
  const ext = path.extname(nomOriginal);
  const base = path
    .basename(nomOriginal, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);
  return `${base}_${Date.now()}${ext}`;
}

// ── Classification automatique par mots-clés ───────────────────────────────
export function classerAutomatiquement(
  nomFichier: string,
  texteExtrait?: string
): DocumentCategorie {
  const contenu = `${nomFichier} ${texteExtrait ?? ''}`.toLowerCase();

  for (const [categorie, motsCles] of Object.entries(MOTS_CLES_CATEGORIES)) {
    if (categorie === 'autre') continue;
    if (motsCles.some((mot) => contenu.includes(mot))) {
      return categorie as DocumentCategorie;
    }
  }

  return 'autre';
}
