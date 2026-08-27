// packages/client/src/pages/utilisateurs/components/UsersSummaryCards.tsx
import { Users, ShieldCheck, ShieldOff, UserCog } from 'lucide-react';
import type { UsersAggregates } from '../users.types';

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value?: number;
  helper: string;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-anac-blue border-blue-100',
    green: 'bg-green-50 text-anac-success border-green-100',
    amber: 'bg-amber-50 text-anac-warning border-amber-100',
    red: 'bg-red-50 text-anac-danger border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }[tone];

  return (
    <div className="card flex min-h-[92px] items-start justify-between p-4">
      <div>
        <p className="text-xs font-medium text-anac-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-anac-navy">
          {value === undefined ? '-' : value}
        </p>
        <p className="mt-1 text-xs text-anac-muted">{helper}</p>
      </div>
      <span className={`rounded-md border p-2 ${toneClasses}`}>{icon}</span>
    </div>
  );
}

// Compteurs globaux uniquement (voir users.service.ts#getUsersAggregates côté
// serveur) — jamais dérivés de la page courante du tableau. Pas de carte
// « Invités » : il n'existe aucun état d'invitation réel dans le modèle, voir
// l'audit Phase 1 (premiereConnexion !== invitation).
export function UsersSummaryCards({ aggregates }: { aggregates?: UsersAggregates }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Total utilisateurs"
        value={aggregates?.total}
        helper="Comptes SICOT"
        icon={<Users size={16} aria-hidden="true" />}
        tone="slate"
      />
      <SummaryCard
        label="Actifs"
        value={aggregates?.actifs}
        helper="Comptes utilisables"
        icon={<ShieldCheck size={16} aria-hidden="true" />}
        tone="green"
      />
      <SummaryCard
        label="Désactivés"
        value={aggregates?.inactifs}
        helper="Accès bloqué"
        icon={<ShieldOff size={16} aria-hidden="true" />}
        tone="red"
      />
      <SummaryCard
        label="Première connexion"
        value={aggregates?.premiereConnexionEnAttente}
        helper="Comptes à initialiser"
        icon={<UserCog size={16} aria-hidden="true" />}
        tone="amber"
      />
    </section>
  );
}
