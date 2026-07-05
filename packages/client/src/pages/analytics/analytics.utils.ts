// packages/client/src/pages/analytics/analytics.utils.ts
import { PRESETS } from './analytics.constants';
import type { PeriodePreset, Periode } from './analytics.types';

export function resoudrePeriode(
  preset: PeriodePreset,
  customDebut: string,
  customFin: string
): Periode {
  if (preset === 'personnalise') {
    return {
      dateDebut: customDebut || undefined,
      dateFin: customFin || undefined,
    };
  }

  const config = PRESETS.find((p) => p.cle === preset);
  if (!config?.jours) return {};

  const fin = new Date();
  const debut = new Date();
  debut.setDate(debut.getDate() - config.jours);

  return {
    dateDebut: debut.toISOString().slice(0, 10),
    dateFin: fin.toISOString().slice(0, 10),
  };
}

export function formatMoisLabel(mois: string): string {
  const [annee, m] = mois.split('-');
  return new Date(parseInt(annee), parseInt(m) - 1).toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit',
  });
}
