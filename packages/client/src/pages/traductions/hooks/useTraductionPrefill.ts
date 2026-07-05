// packages/client/src/pages/traductions/hooks/useTraductionPrefill.ts
import { useEffect } from 'react';

interface UseTraductionPrefillParams {
  onPrefill: (texte: string) => void;
}

/** Reads a one-shot sessionStorage prefill (set by DocumentsPage's "Traduire" action) on mount. */
export function useTraductionPrefill({ onPrefill }: UseTraductionPrefillParams) {
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('traduction_prefill');
      if (prefill) {
        const { texte } = JSON.parse(prefill);
        onPrefill(texte);
        sessionStorage.removeItem('traduction_prefill');
      }
    } catch {
      sessionStorage.removeItem('traduction_prefill');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
