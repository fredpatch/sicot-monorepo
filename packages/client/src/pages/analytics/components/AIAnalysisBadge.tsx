// packages/client/src/pages/analytics/components/BadgeAnalyseIA.tsx
import type { RapportHistorique } from '../analytics.types';

export function BadgeAnalyseIA({ rapport }: { rapport: RapportHistorique }) {
  if (rapport.statutRelectureIA === 'non_applicable') return null;
  if (rapport.statutRelectureIA === 'en_attente')
    return <span className="badge-attention">IA - non relu</span>;
  if (rapport.statutRelectureIA === 'valide') return <span className="badge-actif">IA - relu</span>;
  return <span className="badge-expire">IA - rejeté</span>;
}
