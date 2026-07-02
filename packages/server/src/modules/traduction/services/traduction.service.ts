import { db } from '@/db/index.js';
import { traductions, glossaire, demandesTraduction } from '@/db/schema';
import { eq, and, ilike, or, desc, isNull } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import {
  traduireTexte,
  verifierLibreTranslate,
  type TraductionDirection,
  type MoteurTraduction,
} from '@/utils/traduction.js';
import { toTraductionView, enrichirGlossaireDepuisCorrection } from './traduction.helpers';
import type {
  TraductionStatut,
  TraductionView,
  LancerTraductionParams,
  SauvegarderCorrectionParams,
} from './traduction.types';

export type {
  TraductionStatut,
  TraductionView,
  LancerTraductionParams,
  SauvegarderCorrectionParams,
} from './traduction.types';

// ── SERVICE : Lancer une traduction ───────────────────────────────────────
export async function lancerTraduction(params: LancerTraductionParams): Promise<TraductionView> {
  // Vérifier que le translate-service ET LibreTranslate sont accessibles
  const { accessible } = await verifierLibreTranslate();

  if (!accessible) {
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
      details: { statut: 'manuelle_requise', raison: 'Translate service inaccessible' },
    });

    return toTraductionView(traduction);
  }

  // ── Traduire via le microservice translate-service (port 5002) ────────
  const { texteFinal, succes, erreurs, moteur } = await traduireTexte(
    params.texteOriginal,
    params.direction
  );

  const moteurValide: MoteurTraduction =
    moteur === 'deepL' ? 'deepl' : moteur === 'manuel' ? 'manuel' : 'libretranslate';

  const statut: TraductionStatut = succes ? 'a_reviser' : 'manuelle_requise';

  const [traduction] = await db
    .insert(traductions)
    .values({
      documentId: params.documentId,
      texteOriginal: params.texteOriginal,
      texteIA: succes ? texteFinal : null,
      direction: params.direction,
      statut,
      moteurUtilise: moteurValide, // ← moteur retourné par le microservice
      traducteurId: params.userId,
    })
    .returning();

  await logAudit({
    userId: params.userId,
    action: 'TRADUCTION_LANCEE',
    module: 'M6',
    entiteId: traduction.id,
    details: { direction: params.direction, statut, erreurs, moteur },
  });

  return toTraductionView(traduction);
}

// ── SERVICE : Sauvegarder la correction du traducteur ─────────────────────
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

  // Delta : enrichir le glossaire automatiquement si correction différente de l'IA
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
  // Toujours filtrer les supprimées par défaut
  conditions.push(isNull(traductions.deletedAt));

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

// ── SERVICE : Vérifier le translate-service + LibreTranslate ─────────────
export async function verifierMoteur(): Promise<{
  accessible: boolean;
  langues: string[];
  erreur?: string;
}> {
  return verifierLibreTranslate();
}

// ── Soft delete traduction ────────────────────────────────────────────────
export async function supprimerTraduction(id: number, userId: number): Promise<TraductionView> {
  const [existante] = await db.select().from(traductions).where(eq(traductions.id, id));

  if (!existante) throw new Error('TRADUCTION_INTROUVABLE');

  // Bloquer suppression si approuvée ou archivée
  if (existante.statut === 'approuvee') {
    throw new Error('TRADUCTION_APPROUVEE_NON_SUPPRIMABLE');
  }
  if (existante.statut === 'archivee') {
    throw new Error('TRADUCTION_ARCHIVEE_NON_SUPPRIMABLE');
  }
  if (existante.deletedAt) {
    throw new Error('TRADUCTION_DEJA_SUPPRIMEE');
  }

  const [updated] = await db
    .update(traductions)
    .set({ deletedAt: new Date() })
    .where(eq(traductions.id, id))
    .returning();

  // Si une demande M5 est liée — la remettre en statut soumise
  await db
    .update(demandesTraduction)
    .set({ statut: 'soumise', traducteurId: null, verrou: false, updatedAt: new Date() })
    .where(eq(demandesTraduction.traductionId, id));

  await logAudit({
    userId,
    action: 'TRADUCTION_SUPPRIMEE',
    module: 'M6',
    entiteId: id,
    details: { statut: existante.statut },
  });

  return toTraductionView(updated);
}

// ── Restaurer une traduction supprimée ────────────────────────────────────
export async function restaurerTraduction(id: number, userId: number): Promise<TraductionView> {
  const [existante] = await db.select().from(traductions).where(eq(traductions.id, id));

  if (!existante) throw new Error('TRADUCTION_INTROUVABLE');
  if (!existante.deletedAt) throw new Error('TRADUCTION_NON_SUPPRIMEE');

  const [updated] = await db
    .update(traductions)
    .set({ deletedAt: null })
    .where(eq(traductions.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'TRADUCTION_RESTAUREE',
    module: 'M6',
    entiteId: id,
  });

  return toTraductionView(updated);
}
