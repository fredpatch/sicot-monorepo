// packages/client/src/pages/demandes/components/BadgeStatut.tsx
import { Clock, ArrowRight, CheckCircle2, Archive } from 'lucide-react';
import type { DemandeStatut } from '@/lib/demandes.api';

export function BadgeStatut({ statut }: { statut: DemandeStatut }) {
  const config: Record<DemandeStatut, { label: string; classe: string; icone: React.ReactNode }> = {
    soumise: { label: 'Soumise', classe: 'badge-info', icone: <Clock size={10} /> },
    en_cours: { label: 'En cours', classe: 'badge-warning', icone: <ArrowRight size={10} /> },
    en_relecture: { label: 'En relecture', classe: 'badge-info', icone: <Clock size={10} /> },
    validee: { label: 'Validée', classe: 'badge-actif', icone: <CheckCircle2 size={10} /> },
    archivee: { label: 'Archivée', classe: 'badge-expire', icone: <Archive size={10} /> },
  };
  const { label, classe, icone } = config[statut];
  return (
    <span className={`${classe} inline-flex items-center gap-1`}>
      {icone} {label}
    </span>
  );
}
