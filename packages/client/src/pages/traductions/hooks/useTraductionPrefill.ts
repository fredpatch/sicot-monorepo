// packages/client/src/pages/traductions/hooks/useTraductionPrefill.ts
import { useEffect } from 'react';

interface TraductionPrefill {
  texte: string;
  documentId?: number;
}

interface UseTraductionPrefillParams {
  onPrefill: (prefill: TraductionPrefill) => void;
}

/** Reads a one-shot sessionStorage prefill (set by DocumentsPage's "Traduire" action) on mount. */
export function useTraductionPrefill({ onPrefill }: UseTraductionPrefillParams) {
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('traduction_prefill');
      if (prefill) {
        const { texte, documentId } = JSON.parse(prefill);
        onPrefill({ texte, documentId });
        sessionStorage.removeItem('traduction_prefill');
      }
    } catch {
      sessionStorage.removeItem('traduction_prefill');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
