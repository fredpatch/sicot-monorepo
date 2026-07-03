import axios from 'axios';
import type { TraductionDirection, ResultatTraduction, SegmentTraduit } from './traduction.types';
import { getValeurBooleen } from '@/modules/parametres/services/parametres.service';

export type {
  TraductionDirection,
  MoteurTraduction,
  ResultatTraduction,
  SegmentTraduit,
} from './traduction.types';

// ── Configuration ──────────────────────────────────────────────────────────
// Appelle notre microservice translate-service (port 5002)
// qui lui-même appelle LibreTranslate (port 5000) avec nettoyage et fallback
const TRANSLATE_SERVICE_URL = process.env.TRANSLATE_SERVICE_URL ?? 'http://localhost:5002';

// ── Convertir direction SICOT → codes langue ──────────────────────────────
function toLangCodes(direction: TraductionDirection): {
  source: string;
  cible: string;
} {
  return direction === 'fr_en' ? { source: 'fr', cible: 'en' } : { source: 'en', cible: 'fr' };
}

// ── Traduire un segment court ──────────────────────────────────────────────
// Utilisé pour les textes libres courts (demandes M5)
export async function traduireSegment(
  texte: string,
  direction: TraductionDirection
): Promise<ResultatTraduction> {
  if (!texte.trim()) {
    return { texteTraduit: '', moteur: 'libretranslate', succes: true };
  }

  const { source, cible } = toLangCodes(direction);
  const deeplActif = await getValeurBooleen('deepl_fallback_actif', false);

  try {
    const res = await axios.post(
      `${TRANSLATE_SERVICE_URL}/translate`,
      { texte, source, cible, deepl_actif: deeplActif },
      { timeout: 30000 }
    );

    return {
      texteTraduit: res.data.texte as string,
      moteur: (res.data.moteur as 'libretranslate' | 'deepl') ?? 'libretranslate',
      succes: res.data.succes as boolean,
    };
  } catch (error) {
    console.error('[traduction] Translate service erreur:', error);
    return {
      texteTraduit: '',
      moteur: 'libretranslate',
      succes: false,
      erreur: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// ── Traduire un texte long par segments ───────────────────────────────────
// Utilisé pour les documents (M6) — découpe par paragraphes via le microservice
// onProgression est un callback pour la barre de progression côté client (SSE plus tard)
export async function traduireTexte(
  texte: string,
  direction: TraductionDirection,
  onProgression?: (fait: number, total: number) => void
): Promise<{
  segments: SegmentTraduit[];
  texteFinal: string;
  succes: boolean;
  erreurs: number;
  moteur: string;
}> {
  const { source, cible } = toLangCodes(direction);
  const deeplActif = await getValeurBooleen('deepl_fallback_actif', false);

  try {
    const res = await axios.post(
      `${TRANSLATE_SERVICE_URL}/translate/batch`,
      { texte, source, cible, deepl_actif: deeplActif },
      { timeout: 280000 } // pour les longs documents on laisse 4min40 max (LibreTranslate a un timeout de 5min)
    );

    const data = res.data;

    // Simuler la progression si callback fourni
    // Le microservice ne streame pas encore — on envoie 100% d'un coup
    onProgression?.(data.total_segments ?? 1, data.total_segments ?? 1);

    return {
      segments: (data.segments ?? []).map(
        (s: { original: string; traduit: string; alternatives?: string[] }) => ({
          original: s.original,
          traduit: s.traduit,
          alternatives: s.alternatives ?? [],
        })
      ),
      texteFinal: data.texte_complet as string,
      succes: data.succes as boolean,
      erreurs: data.erreurs?.length ?? 0,
      moteur: data.moteur as string,
    };
  } catch (error) {
    console.error('[traduction] Translate batch erreur:', error);

    // En cas d'échec total, retourner le texte original découpé
    const segmentsOriginaux = texte
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onProgression?.(segmentsOriginaux.length, segmentsOriginaux.length);

    return {
      segments: segmentsOriginaux.map((s) => ({
        original: s,
        traduit: s,
        alternatives: [],
      })),
      texteFinal: texte,
      succes: false,
      erreurs: segmentsOriginaux.length,
      moteur: 'libretranslate',
    };
  }
}

// ── Détecter la langue d'un texte ─────────────────────────────────────────
export async function detecterLangue(texte: string): Promise<string> {
  try {
    const res = await axios.post(`${TRANSLATE_SERVICE_URL}/detect`, { texte }, { timeout: 5000 });
    return res.data.langue as string;
  } catch {
    return 'inconnu';
  }
}

// ── Vérifier que le translate service ET LibreTranslate sont accessibles ──
export async function verifierLibreTranslate(): Promise<{
  accessible: boolean;
  langues: string[];
  deeplConfigure: boolean;
  erreur?: string;
}> {
  try {
    const res = await axios.get(`${TRANSLATE_SERVICE_URL}/health`, { timeout: 5000 });

    const data = res.data;
    const libreTranslateOk = data.moteurs?.libretranslate?.disponible === true;
    const deeplConfigure = data.moteurs?.deepl?.configure === true;

    if (!libreTranslateOk) {
      return {
        accessible: false,
        langues: [],
        deeplConfigure,
        erreur: 'LibreTranslate inaccessible depuis le microservice',
      };
    }

    return {
      accessible: true,
      langues: data.langues_supportees ?? ['fr', 'en'],
      deeplConfigure,
    };
  } catch (error) {
    return {
      accessible: false,
      langues: [],
      deeplConfigure: false,
      erreur: error instanceof Error ? error.message : 'Translate service inaccessible',
    };
  }
}

// ── Vérifier uniquement le microservice translate (sans LibreTranslate) ────
export async function verifierTranslateService(): Promise<boolean> {
  try {
    await axios.get(`${TRANSLATE_SERVICE_URL}/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
