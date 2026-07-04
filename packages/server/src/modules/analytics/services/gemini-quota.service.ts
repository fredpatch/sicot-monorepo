import { db } from '@/db/index.js';
import { geminiUsageQuotidien, rapports, rapportsIAQuotidien } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';

export const CANDIDATS_MODELES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
];

function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Layer 2 : limite globale de rapports IA à la demande, par jour ────────
export async function verifierLimiteRapportsManuelsJour(): Promise<{
  autorise: boolean;
  utilises: number;
  max: number;
}> {
  const max = await getValeurEntier('gemini_rapports_manuels_max_jour', 10);
  const date = aujourdHui();

  const [row] = await db
    .select({ nombreGeneres: rapportsIAQuotidien.nombreGeneres })
    .from(rapportsIAQuotidien)
    .where(eq(rapportsIAQuotidien.date, date));

  const utilises = row?.nombreGeneres ?? 0;
  return { autorise: utilises < max, utilises, max };
}

// ── Incrémente le compteur Layer 2 — appelé une fois la génération commise,
// pas avant (un refus par verifierLimiteRapportsManuelsJour ne compte pas) ──
export async function incrementerRapportsManuelsJour(): Promise<void> {
  const date = aujourdHui();

  await db
    .insert(rapportsIAQuotidien)
    .values({ date, nombreGeneres: 1 })
    .onConflictDoUpdate({
      target: rapportsIAQuotidien.date,
      set: { nombreGeneres: sql`${rapportsIAQuotidien.nombreGeneres} + 1` },
    });
}

// ── Layer 1 : réserve le premier modèle sous son plafond auto-imposé ──────
// Note : lecture puis écriture, pas verrouillé — une course concurrente rare
// pourrait dépasser le plafond de 1 appel. Acceptable vu le volume réel
// (usage interne, quelques appels/jour) ; à revoir si le volume grossit.
export async function reserverModeleDisponible(candidats: string[]): Promise<string | null> {
  const plafond = await getValeurEntier('gemini_quota_journalier_par_modele', 15);
  const date = aujourdHui();

  for (const modele of candidats) {
    const [row] = await db
      .select({ nombreAppels: geminiUsageQuotidien.nombreAppels })
      .from(geminiUsageQuotidien)
      .where(and(eq(geminiUsageQuotidien.modele, modele), eq(geminiUsageQuotidien.date, date)));

    const utilises = row?.nombreAppels ?? 0;
    if (utilises < plafond) {
      await db
        .insert(geminiUsageQuotidien)
        .values({ modele, date, nombreAppels: 1 })
        .onConflictDoUpdate({
          target: [geminiUsageQuotidien.modele, geminiUsageQuotidien.date],
          set: { nombreAppels: sql`${geminiUsageQuotidien.nombreAppels} + 1` },
        });
      return modele;
    }
  }

  return null; // tous les modèles candidats sont à leur plafond auto-imposé
}

// ── Visibilité coût — cumul des tokens de réflexion, pour l'écran de suivi ─
export async function enregistrerThinkingTokens(modele: string, tokens: number): Promise<void> {
  const date = aujourdHui();

  await db
    .update(geminiUsageQuotidien)
    .set({ thinkingTokensTotal: sql`${geminiUsageQuotidien.thinkingTokensTotal} + ${tokens}` })
    .where(and(eq(geminiUsageQuotidien.modele, modele), eq(geminiUsageQuotidien.date, date)));
}

// ── SERVICE : Statut d'usage complet — pour l'écran de suivi admin ────────
export async function getStatutUsageGemini(): Promise<{
  modeles: {
    modele: string;
    appelsAujourdhui: number;
    plafond: number;
    thinkingTokensAujourdhui: number;
  }[];
  rapportsIA: { utilises: number; max: number };
  dernierRapportMensuel: { createdAt: Date; documentId: number } | null;
}> {
  const date = aujourdHui();
  const plafond = await getValeurEntier('gemini_quota_journalier_par_modele', 15);

  const modeles = await Promise.all(
    CANDIDATS_MODELES.map(async (modele) => {
      const [row] = await db
        .select({
          nombreAppels: geminiUsageQuotidien.nombreAppels,
          thinkingTokensTotal: geminiUsageQuotidien.thinkingTokensTotal,
        })
        .from(geminiUsageQuotidien)
        .where(and(eq(geminiUsageQuotidien.modele, modele), eq(geminiUsageQuotidien.date, date)));

      return {
        modele,
        appelsAujourdhui: row?.nombreAppels ?? 0,
        plafond,
        thinkingTokensAujourdhui: row?.thinkingTokensTotal ?? 0,
      };
    })
  );

  const rapportsIA = await verifierLimiteRapportsManuelsJour();

  const [dernierMensuel] = await db
    .select({ createdAt: rapports.createdAt, documentId: rapports.documentId })
    .from(rapports)
    .where(eq(rapports.type, 'mensuel'))
    .orderBy(desc(rapports.createdAt))
    .limit(1);

  return {
    modeles,
    rapportsIA: { utilises: rapportsIA.utilises, max: rapportsIA.max },
    dernierRapportMensuel: dernierMensuel ?? null,
  };
}
