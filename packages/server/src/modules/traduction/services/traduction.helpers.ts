import { db } from '@/db/index.js';
import { traductions, glossaire } from '@/db/schema';
import { and, ilike } from 'drizzle-orm';
import type { TraductionDirection } from '@/utils/traduction.js';
import type { TraductionStatut, TraductionView } from './traduction.types';

export function toTraductionView(t: typeof traductions.$inferSelect): TraductionView {
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

// ── Enrichissement glossaire depuis delta corrections ─────────────────────
export async function enrichirGlossaireDepuisCorrection(params: {
  texteOriginal: string;
  texteIA: string;
  texteCorrige: string;
  direction: TraductionDirection;
  userId: number;
}): Promise<void> {
  try {
    const segmentsIA = params.texteIA.split(/\n{2,}/);
    const segmentsCorrige = params.texteCorrige.split(/\n{2,}/);
    const segmentsOrig = params.texteOriginal.split(/\n{2,}/);

    for (let i = 0; i < Math.min(segmentsIA.length, segmentsCorrige.length); i++) {
      const ia = segmentsIA[i]?.trim() ?? '';
      const corrige = segmentsCorrige[i]?.trim() ?? '';
      const orig = segmentsOrig[i]?.trim() ?? '';

      if (ia !== corrige && orig.length > 0 && orig.length < 100) {
        const termeFr = params.direction === 'fr_en' ? orig : corrige;
        const termeEn = params.direction === 'fr_en' ? corrige : orig;

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
    console.warn('[traduction] Enrichissement glossaire échoué:', error);
  }
}
