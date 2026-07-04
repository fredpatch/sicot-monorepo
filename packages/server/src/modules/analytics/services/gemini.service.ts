/* eslint-disable @typescript-eslint/no-unused-vars */
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { db } from '@/db/index.js';
import { rapports } from '@/db/schema';
import { eq, and, lte, desc } from 'drizzle-orm';
import { getGlobalAnalytics } from './analytics.service';
import {
  reserverModeleDisponible,
  enregistrerThinkingTokens,
  CANDIDATS_MODELES,
} from './gemini-quota.service';

const SEUIL_ACTIVITE_MINIMALE = 5; // total agrégé toutes métriques confondues

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function construireConfigThinking(modele: string) {
  return modele.startsWith('gemini-3')
    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    : { thinkingConfig: { thinkingBudget: 0 } };
}

// ── Anonymisation - retire noms/matricules avant tout envoi à Gemini ───────
// Règle absolue : aucune donnée nominative ne quitte le serveur, quel que
// soit ce que dit la gouvernance DG/RGPD par ailleurs.
function anonymiser(
  dataParModule: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const copie = JSON.parse(JSON.stringify(dataParModule));

  for (const moduleData of Object.values(copie) as Record<string, unknown>[]) {
    for (const [cle, valeur] of Object.entries(moduleData)) {
      if (!Array.isArray(valeur)) continue;
      moduleData[cle] = valeur.map((item: unknown, i: number) => {
        if (item && typeof item === 'object' && ('matricule' in item || 'nom' in item)) {
          const { nom, prenom, matricule, ...reste } = item as Record<string, unknown>;
          return { ...reste, agent: `Agent ${String.fromCharCode(65 + (i % 26))}` };
        }
        return item;
      });
    }
  }

  return copie;
}

// ── Delta déterministe vs le dernier rapport validé - jamais calculé par le modèle ──
async function trouverPeriodePrecedenteValidee(
  periodeDebutActuelle: Date
): Promise<{ dateDebut: Date; dateFin: Date } | null> {
  const [precedent] = await db
    .select({ periodeDebut: rapports.periodeDebut, periodeFin: rapports.periodeFin })
    .from(rapports)
    .where(
      and(eq(rapports.statutRelectureIA, 'valide'), lte(rapports.periodeFin, periodeDebutActuelle))
    )
    .orderBy(desc(rapports.periodeFin))
    .limit(1);

  return precedent ? { dateDebut: precedent.periodeDebut, dateFin: precedent.periodeFin } : null;
}

function calculerVariation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return actuel === 0 ? 0 : null; // évite division par zéro - null = "non calculable"
  return Math.round(((actuel - precedent) / precedent) * 100);
}

async function calculerDeltas(periodeActuelle: { dateDebut: Date; dateFin: Date }) {
  const periodePrecedente = await trouverPeriodePrecedenteValidee(periodeActuelle.dateDebut);
  if (!periodePrecedente) return null;

  const [actuel, precedent] = await Promise.all([
    getGlobalAnalytics(periodeActuelle),
    getGlobalAnalytics(periodePrecedente),
  ]);

  const paires: [string, number, number][] = [
    ['accords_signes', actuel.accords.totalSignes, precedent.accords.totalSignes],
    ['courriers_traites', actuel.courriers.totalVolume, precedent.courriers.totalVolume],
    ['missions', actuel.missions.totalMissions, precedent.missions.totalMissions],
    ['traductions', actuel.traductions.totalTraductions, precedent.traductions.totalTraductions],
    ['demandes_traitees', actuel.demandes.totalTraitees, precedent.demandes.totalTraitees],
    ['documents_ajoutes', actuel.documents.totalAjoutes, precedent.documents.totalAjoutes],
    [
      'termes_glossaire',
      actuel.glossaire.totalTermesAjoutes,
      precedent.glossaire.totalTermesAjoutes,
    ],
  ];

  return Object.fromEntries(
    paires.map(([cle, a, p]) => [
      cle,
      { actuel: a, precedent: p, variationPourcentage: calculerVariation(a, p) },
    ])
  );
}

function totalActivite(dataParModule: Record<string, unknown>): number {
  return (
    JSON.stringify(dataParModule)
      .match(/"total\w*":\s*(\d+)/g)
      ?.reduce((somme, m) => {
        const n = parseInt(m.split(':')[1].trim());
        return somme + n;
      }, 0) ?? 0
  );
}

// ── Construction du prompt ──────────────────────────────────────────────
function construirePrompt(
  dataAnonymisee: Record<string, unknown>,
  deltas: Record<string, unknown> | null,
  periode: { dateDebut: Date; dateFin: Date }
): string {
  return `
Tu es un analyste institutionnel rédigeant une synthèse d'activité pour la Cellule de Coopération Internationale et de Traduction (CCIT) de l'ANAC Gabon (Agence Nationale de l'Aviation Civile).

RÈGLES ABSOLUES - à respecter sans exception :
1. Réponds exclusivement en français, dans un ton institutionnel sobre.
2. N'utilise QUE les chiffres fournis ci-dessous. N'invente, n'estime, ni n'extrapole aucun chiffre absent des données.
3. Les variations (deltas) fournies sont déjà calculées et vérifiées - reformule-les, ne les recalcule jamais toi-même.
4. Ne spéculate jamais sur les motivations, la fiabilité, ou le contexte géopolitique des partenaires étrangers. Tiens-toi strictement aux métriques opérationnelles.
5. Si une donnée est absente ou insuffisante pour conclure, dis-le explicitement plutôt que de combler par une supposition plausible.
6. Les agents sont anonymisés ("Agent A", "Agent B"...) - ne tente jamais de déduire ou nommer une identité réelle.

STRUCTURE ATTENDUE (Markdown) :
## Résumé exécutif
## Tendances par module
## Points d'attention
## Recommandations

Période analysée : du ${periode.dateDebut.toLocaleDateString('fr-FR')} au ${periode.dateFin.toLocaleDateString('fr-FR')}

DONNÉES DE LA PÉRIODE (JSON) :
${JSON.stringify(dataAnonymisee, null, 2)}

${deltas ? `VARIATIONS VS PÉRIODE PRÉCÉDENTE VALIDÉE (déjà calculées, ne pas recalculer) :\n${JSON.stringify(deltas, null, 2)}` : 'Aucun rapport précédent validé disponible - pas de comparaison possible, ne pas en simuler une.'}
  `.trim();
}

// ── Appel Gemini avec rotation proactive + repli réactif ──────────────────
async function appellerGeminiAvecRotation(
  prompt: string
): Promise<{ texte: string; modeleUtilise: string }> {
  const modele = await reserverModeleDisponible(CANDIDATS_MODELES);
  if (!modele) {
    throw new Error("Tous les modèles Gemini ont atteint leur plafond auto-imposé aujourd'hui.");
  }

  try {
    const response = await ai.models.generateContent({
      model: modele,
      contents: prompt,
      config: construireConfigThinking(modele),
    });

    if (response.usageMetadata?.thoughtsTokenCount) {
      await enregistrerThinkingTokens(modele, response.usageMetadata.thoughtsTokenCount);
    }

    return { texte: response.text ?? '', modeleUtilise: modele };
  } catch (err) {
    // Filet de sécurité réactif — ne devrait presque jamais se déclencher
    // puisque reserverModeleDisponible a déjà écarté les modèles à plafond
    const estQuotaEpuise = /RESOURCE_EXHAUSTED|429|quota/i.test(String(err));
    if (!estQuotaEpuise) throw err;

    const restants = CANDIDATS_MODELES.filter((m) => m !== modele);
    const secours = await reserverModeleDisponible(restants);
    if (!secours) throw new Error('Quota Gemini épuisé sur tous les modèles disponibles.');

    const response = await ai.models.generateContent({
      model: secours,
      contents: prompt,
      config: construireConfigThinking(secours),
    });
    return { texte: response.text ?? '', modeleUtilise: secours };
  }
}

// ── SERVICE PUBLIC : Générer le narratif IA d'un rapport ───────────────────
export async function genererNarratifIA(
  dataParModule: Record<string, Record<string, unknown>>,
  periode: { dateDebut: Date; dateFin: Date }
): Promise<{ texte: string; modeleUtilise: string; insuffisant: boolean }> {
  const total = totalActivite(dataParModule);

  if (total < SEUIL_ACTIVITE_MINIMALE) {
    // Garde-fou déterministe - pas d'appel Gemini du tout sur une période
    // trop calme, plutôt que de risquer une "tendance" inventée sur du bruit
    return {
      texte: `## Résumé exécutif\n\nActivité insuffisante sur cette période (${total} événement(s) au total) pour produire une analyse pertinente. Aucune tendance fiable ne peut être dégagée d'un volume aussi faible.`,
      modeleUtilise: 'none',
      insuffisant: true,
    };
  }

  const dataAnonymisee = anonymiser(dataParModule);
  const deltas = await calculerDeltas(periode);
  const prompt = construirePrompt(dataAnonymisee, deltas, periode);

  const { texte, modeleUtilise } = await appellerGeminiAvecRotation(prompt);
  return { texte, modeleUtilise, insuffisant: false };
}
