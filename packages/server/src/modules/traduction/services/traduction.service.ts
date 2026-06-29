/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from '@/db/index.js';
import { traductions, documents, glossaire } from '@/db/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import {
  traduireTexte,
  traduireSegment,
  verifierLibreTranslate,
  type TraductionDirection,
} from '@/utils/traduction.js';

// ── Types ──────────────────────────────────────────────────────────────────
export type TraductionStatut =
  'a_reviser' | 'en_relecture' | 'approuvee' | 'archivee' | 'manuelle_requise';

export interface TraductionView {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: TraductionDirection;
  statut: TraductionStatut;
  moteurUtilise: string;
  traducteurId?: number;
  relecteurId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LancerTraductionParams {
  documentId?: number;
  texteOriginal: string;
  direction: TraductionDirection;
  userId: number;
}

export interface SauvegarderCorrectionParams {
  id: number;
  texteFinal: string;
  userId: number;
}

// ── Utilitaire ─────────────────────────────────────────────────────────────
function toTraductionView(t: typeof traductions.$inferSelect): TraductionView {
  return {
    id: t.id,
    documentId: t.documentId ?? undefined,
    texteOriginal: t.texteOriginal ?? undefined,
    texteIA: t.texteIA ?? undefined,
    texteFinal: t.texteFinal ?? undefined,
    direction: t.direction as TraductionDirection,
    statut: t.statut as TraductionStatut,
    moteurUtilise: t.moteurUtilise,
    traducteurId: t.traducteurId ?? undefined,
    relecteurId: t.relecteurId ?? undefined,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// ── SERVICE : Lancer une traduction ───────────────────────────────────────
export async function lancerTraduction(params: LancerTraductionParams): Promise<TraductionView> {
  // Vérifier LibreTranslate disponible
  const { accessible } = await verifierLibreTranslate();

  if (!accessible) {
    // Créer traduction avec statut manuelle_requise
    const [traduction] = await db
      .insert(traductions)
      .values({
        documentId: params.documentId,
        texteOriginal: params.texteOriginal,
        direction: params.direction,
        statut: 'manuelle_requise',
        moteurUtilise: 'libretranslate',
        traducteurId: params.userId,
      })
      .returning();

    await logAudit({
      userId: params.userId,
      action: 'TRADUCTION_LANCEE',
      module: 'M6',
      entiteId: traduction.id,
      details: { statut: 'manuelle_requise', raison: 'LibreTranslate inaccessible' },
    });

    return toTraductionView(traduction);
  }

  // Traduire le texte
  const { texteFinal, succes, erreurs } = await traduireTexte(
    params.texteOriginal,
    params.direction
  );

  const statut: TraductionStatut = succes ? 'a_reviser' : 'manuelle_requise';

  const [traduction] = await db
    .insert(traductions)
    .values({
      documentId: params.documentId,
      texteOriginal: params.texteOriginal,
      texteIA: succes ? texteFinal : null,
      direction: params.direction,
      statut,
      moteurUtilise: 'libretranslate',
      traducteurId: params.userId,
    })
    .returning();

  await logAudit({
    userId: params.userId,
    action: 'TRADUCTION_LANCEE',
    module: 'M6',
    entiteId: traduction.id,
    details: { direction: params.direction, statut, erreurs },
  });

  return toTraductionView(traduction);
}

// ── SERVICE : Sauvegarder la correction du traducteur ─────────────────────
// Calcule le delta IA vs corrigé → enrichit M7
export async function sauvegarderCorrection(
  params: SauvegarderCorrectionParams
): Promise<TraductionView> {
  const [existante] = await db.select().from(traductions).where(eq(traductions.id, params.id));

  if (!existante) throw new Error('TRADUCTION_INTROUVABLE');

  const [updated] = await db
    .update(traductions)
    .set({
      texteFinal: params.texteFinal,
      traducteurId: params.userId,
      updatedAt: new Date(),
    })
    .where(eq(traductions.id, params.id))
    .returning();

  // ── Delta : enrichir le glossaire automatiquement ─────────────────────
  // Si la correction diffère significativement de la traduction IA,
  // on extrait les termes modifiés et on les propose au glossaire
  if (existante.texteIA && params.texteFinal !== existante.texteIA) {
    await enrichirGlossaireDepuisCorrection({
      texteOriginal: existante.texteOriginal ?? '',
      texteIA: existante.texteIA,
      texteCorrige: params.texteFinal,
      direction: existante.direction as TraductionDirection,
      userId: params.userId,
    });
  }

  await logAudit({
    userId: params.userId,
    action: 'TRADUCTION_CORRIGEE',
    module: 'M6',
    entiteId: params.id,
  });

  return toTraductionView(updated);
}

// ── SERVICE : Approuver une traduction ────────────────────────────────────
export async function approuverTraduction(id: number, userId: number): Promise<TraductionView> {
  const [existante] = await db.select().from(traductions).where(eq(traductions.id, id));

  if (!existante) throw new Error('TRADUCTION_INTROUVABLE');
  if (!existante.texteFinal && !existante.texteIA) {
    throw new Error('TEXTE_FINAL_REQUIS');
  }

  const [updated] = await db
    .update(traductions)
    .set({
      statut: 'approuvee',
      relecteurId: userId,
      updatedAt: new Date(),
    })
    .where(eq(traductions.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'TRADUCTION_APPROUVEE',
    module: 'M6',
    entiteId: id,
  });

  return toTraductionView(updated);
}

// ── SERVICE : Archiver une traduction ─────────────────────────────────────
// Bloqué sans approbation humaine — règle métier non contournable
export async function archiverTraduction(id: number, userId: number): Promise<TraductionView> {
  const [existante] = await db.select().from(traductions).where(eq(traductions.id, id));

  if (!existante) throw new Error('TRADUCTION_INTROUVABLE');
  if (existante.statut !== 'approuvee') {
    throw new Error('APPROBATION_REQUISE');
  }

  const [updated] = await db
    .update(traductions)
    .set({ statut: 'archivee', updatedAt: new Date() })
    .where(eq(traductions.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'TRADUCTION_ARCHIVEE',
    module: 'M6',
    entiteId: id,
  });

  return toTraductionView(updated);
}

// ── SERVICE : Lister les traductions ──────────────────────────────────────
export async function listerTraductions(filters: {
  statut?: TraductionStatut;
  direction?: TraductionDirection;
  page?: number;
  pageSize?: number;
}): Promise<{ data: TraductionView[]; total: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.statut) conditions.push(eq(traductions.statut, filters.statut));
  if (filters.direction) conditions.push(eq(traductions.direction, filters.direction));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(traductions)
    .where(where)
    .orderBy(desc(traductions.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(traductions, where);

  return { data: rows.map(toTraductionView), total };
}

// ── SERVICE : Récupérer une traduction ────────────────────────────────────
export async function getTraduction(id: number): Promise<TraductionView> {
  const [traduction] = await db.select().from(traductions).where(eq(traductions.id, id));

  if (!traduction) throw new Error('TRADUCTION_INTROUVABLE');
  return toTraductionView(traduction);
}

// ── SERVICE : Suggestions glossaire pour l'éditeur ───────────────────────
export async function getSuggestionsGlossaire(
  texte: string,
  direction: TraductionDirection
): Promise<Array<{ termeFr: string; termeEn: string; domaine?: string }>> {
  const mots = texte
    .toLowerCase()
    .split(/\s+/)
    .filter((m) => m.length > 3);

  if (mots.length === 0) return [];

  const conditions = mots
    .slice(0, 5)
    .map((mot) =>
      direction === 'fr_en'
        ? ilike(glossaire.termeFr, `%${mot}%`)
        : ilike(glossaire.termeEn, `%${mot}%`)
    );

  const rows = await db
    .select({
      termeFr: glossaire.termeFr,
      termeEn: glossaire.termeEn,
      domaine: glossaire.domaine,
    })
    .from(glossaire)
    .where(and(eq(glossaire.actif, true), or(...conditions)))
    .limit(10);

  return rows.map((r) => ({
    termeFr: r.termeFr,
    termeEn: r.termeEn,
    domaine: r.domaine ?? undefined,
  }));
}

// ── SERVICE : Vérifier LibreTranslate ────────────────────────────────────
export async function verifierMoteur(): Promise<{
  accessible: boolean;
  langues: string[];
  erreur?: string;
}> {
  return verifierLibreTranslate();
}

// ── Enrichissement glossaire depuis delta corrections ─────────────────────
// Fonction interne — compare IA vs corrigé, propose les termes nouveaux
async function enrichirGlossaireDepuisCorrection(params: {
  texteOriginal: string;
  texteIA: string;
  texteCorrige: string;
  direction: TraductionDirection;
  userId: number;
}): Promise<void> {
  try {
    // Segmenter les deux versions
    const segmentsIA = params.texteIA.split(/\n{2,}/);
    const segmentsCorrige = params.texteCorrige.split(/\n{2,}/);
    const segmentsOrig = params.texteOriginal.split(/\n{2,}/);

    for (let i = 0; i < Math.min(segmentsIA.length, segmentsCorrige.length); i++) {
      const ia = segmentsIA[i]?.trim() ?? '';
      const corrige = segmentsCorrige[i]?.trim() ?? '';
      const orig = segmentsOrig[i]?.trim() ?? '';

      // Si le segment a été modifié de façon significative
      if (ia !== corrige && orig.length > 0 && orig.length < 100) {
        const termeFr = params.direction === 'fr_en' ? orig : corrige;
        const termeEn = params.direction === 'fr_en' ? corrige : orig;

        // Vérifier si le terme n'existe pas déjà
        const [existant] = await db
          .select()
          .from(glossaire)
          .where(and(ilike(glossaire.termeFr, termeFr), ilike(glossaire.termeEn, termeEn)));

        if (!existant && termeFr.length > 2 && termeEn.length > 2) {
          await db.insert(glossaire).values({
            termeFr,
            termeEn,
            domaine: 'Traduction automatique',
            contexte: 'Ajouté automatiquement depuis delta corrections M6',
            actif: true,
            createdPar: params.userId,
          });
        }
      }
    }
  } catch (error) {
    // Non bloquant — on log mais on ne fait pas échouer la sauvegarde
    console.warn('[traduction] Enrichissement glossaire échoué:', error);
  }
}
