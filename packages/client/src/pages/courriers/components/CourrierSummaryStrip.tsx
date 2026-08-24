import { CountryMark } from '@/pages/partenaires/components/CountryMark';
import type { Courrier } from '../courrier.types';
import { formatCourrierDate, formatCourrierDeadline, getCourrierInterlocutor } from '../courrier.utils';
import { CourrierStatusBadge } from './CourrierStatusBadge';

export function CourrierSummaryStrip({ courrier }: { courrier: Courrier }) {
  const interlocuteur = getCourrierInterlocutor(courrier);
  const interlocuteurLabel = courrier.direction === 'entrant' ? 'Expéditeur' : 'Destinataire';

  return (
    <section className="grid grid-cols-2 gap-3 rounded-lg border border-anac-border bg-white p-4 md:grid-cols-5">
      <SummaryItem label="Statut" value={<CourrierStatusBadge statut={courrier.suiviStatut} />} />
      <SummaryItem label="Date" value={formatCourrierDate(courrier.dateReception)} />
      <SummaryItem
        label={interlocuteurLabel}
        value={
          interlocuteur ? (
            <span className="inline-flex items-center gap-1.5">
              <CountryMark country={interlocuteur.pays} />
              {interlocuteur.nom}
            </span>
          ) : (
            '-'
          )
        }
      />
      <SummaryItem label="Échéance" value={formatCourrierDeadline(courrier)} />
      <SummaryItem
        label="Réponse requise"
        value={
          courrier.reponseRequise === 'oui'
            ? 'Oui'
            : courrier.reponseRequise === 'non'
              ? 'Non'
              : 'Pour information'
        }
      />
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-r border-anac-border pr-3 last:border-r-0">
      <p className="text-xs text-anac-muted">{label}</p>
      <div className="mt-1 font-semibold text-anac-navy">{value}</div>
    </div>
  );
}
