import { ArrowRight } from 'lucide-react';
import { formatMissionDate, formatMissionPeriod } from '../mission.utils';

// Visual date-range display — uses a real icon instead of a "→" unicode
// character (flagged in review: prefer icons from the icon library used
// throughout the app over unicode glyphs for anything rendered in the UI).
// `formatMissionPeriod` in mission.utils.ts still returns a plain string
// for text-only contexts (aria-labels, title attributes) where JSX can't go.
export function MissionPeriod({
  dateDebut,
  dateFin,
  className,
}: {
  dateDebut?: string;
  dateFin?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ''}`}
      aria-label={formatMissionPeriod({ dateDebut, dateFin })}
    >
      <span aria-hidden="true">{formatMissionDate(dateDebut)}</span>
      <ArrowRight size={12} className="shrink-0 text-anac-muted" aria-hidden="true" />
      <span aria-hidden="true">{formatMissionDate(dateFin)}</span>
    </span>
  );
}
