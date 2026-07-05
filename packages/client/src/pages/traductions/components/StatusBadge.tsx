// packages/client/src/pages/traductions/components/BadgeStatut.tsx
import { AlertCircle, CheckCircle2, Clock, Archive } from 'lucide-react';
import type { TraductionStatut } from '@/lib/traductions.api';

export function BadgeStatut({ statut }: { statut: TraductionStatut }) {
  const config: Record<
    TraductionStatut,
    { label: string; classe: string; icone: React.ReactNode }
  > = {
    a_reviser: { label: 'À réviser', classe: 'badge-warning', icone: <Clock size={10} /> },
    en_relecture: { label: 'En relecture', classe: 'badge-info', icone: <Clock size={10} /> },
    approuvee: { label: 'Approuvée', classe: 'badge-actif', icone: <CheckCircle2 size={10} /> },
    archivee: { label: 'Archivée', classe: 'badge-expire', icone: <Archive size={10} /> },
    manuelle_requise: {
      label: 'Manuelle requise',
      classe: 'badge-expire',
      icone: <AlertCircle size={10} />,
    },
  };
  const { label, classe, icone } = config[statut];
  return (
    <span className={`${classe} inline-flex items-center gap-1`}>
      {icone} {label}
    </span>
  );
}
