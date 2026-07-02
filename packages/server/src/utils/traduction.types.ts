export type TraductionDirection = 'fr_en' | 'en_fr';

export type MoteurTraduction = 'libretranslate' | 'deepl' | 'manuel';

export interface ResultatTraduction {
  texteTraduit: string;
  moteur: 'libretranslate' | 'deepl' | 'manuel';
  succes: boolean;
  erreur?: string;
}

export interface SegmentTraduit {
  original: string;
  traduit: string;
  alternatives?: string[];
}
