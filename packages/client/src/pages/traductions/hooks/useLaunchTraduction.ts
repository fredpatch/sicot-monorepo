// packages/client/src/pages/traductions/hooks/useLancerTraduction.ts
import { useState } from 'react';
import { traductionsApi, type TraductionDirection } from '@/lib/traductions.api';

interface UseLancerTraductionParams {
  onSuccess: (traductionId: number) => void;
  onRefetchListe: () => void;
}

export function useLancerTraduction({ onSuccess, onRefetchListe }: UseLancerTraductionParams) {
  const [lancement, setLancement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer(texteOriginal: string, direction: TraductionDirection) {
    if (!texteOriginal.trim()) return;

    setLancement(true);
    setErreur(null);

    try {
      const res = await traductionsApi.lancer({ texteOriginal, direction });
      onSuccess(res.data.id);
    } catch (err: unknown) {
      console.error('[traduction] Erreur lancement:', err);

      const axiosErr = err as {
        code?: string;
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
        setErreur(
          'La traduction prend plus de temps que prévu. Vérifiez dans la liste - elle est peut-être déjà en cours.'
        );
        onRefetchListe();
        return;
      }

      if (axiosErr.response?.data?.message) {
        setErreur(axiosErr.response.data.message);
        return;
      }

      if (axiosErr.code === 'ERR_NETWORK') {
        setErreur('Erreur réseau - vérifiez que le serveur est démarré.');
        return;
      }

      setErreur(`Erreur inattendue : ${axiosErr.message ?? 'inconnue'}`);
    } finally {
      setLancement(false);
    }
  }

  return { lancer, lancement, erreur, resetErreur: () => setErreur(null) };
}
