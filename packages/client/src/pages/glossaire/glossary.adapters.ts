// packages/client/src/pages/glossaire/glossary.adapters.ts
//
// Normalization layer: the backend still stores one concept as fixed
// `termeFr`/`termeEn` columns, but the UI is built against a generic
// variants list so a future language (ES, PT, ...) only requires adding
// an entry to `toGlossaryConceptViewModel`, not reshaping the registry,
// the workspace, or the table columns.
import type { Terme } from './glossary.types';
import type { TermeFormData } from './glossary.schemas';

export interface TermVariant {
  language: string;
  value: string;
}

export interface GlossaryConceptViewModel {
  id: number;
  primaryLanguage: string;
  variants: TermVariant[];
  domaine?: string;
  contexte?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  historique?: Terme['historique'];
}

export function toGlossaryConceptViewModel(terme: Terme): GlossaryConceptViewModel {
  return {
    id: terme.id,
    primaryLanguage: 'fr',
    variants: [
      { language: 'fr', value: terme.termeFr },
      { language: 'en', value: terme.termeEn },
    ],
    domaine: terme.domaine,
    contexte: terme.contexte,
    actif: terme.actif,
    createdAt: terme.createdAt,
    updatedAt: terme.updatedAt,
    historique: terme.historique,
  };
}

export function getPrimaryVariant(concept: GlossaryConceptViewModel): TermVariant {
  return (
    concept.variants.find((v) => v.language === concept.primaryLanguage) ?? concept.variants[0]
  );
}

export function toApiPayload(formData: TermeFormData): {
  termeFr: string;
  termeEn: string;
  domaine?: string;
  contexte?: string;
} {
  return {
    termeFr: formData.termeFr,
    termeEn: formData.termeEn,
    domaine: formData.domaine || undefined,
    contexte: formData.contexte || undefined,
  };
}

// Future-compatible shape for a multilingual suggestion lookup (not wired
// to any endpoint today - the current backend only supports FR/EN).
export interface GlossaryLookupRequest {
  sourceLanguage: string;
  targetLanguage: string;
  query: string;
}
