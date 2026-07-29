import { FileText, Globe2, Languages, Mail, Plane } from 'lucide-react';

import type { DashboardData } from '../dashboard.types';
import { asNumber } from '../dashboard.utils';
import { OperationalKpiCard } from './OperationalKpiCard';

export function OperationalKpiGrid({ data }: { data: DashboardData }) {
  const accords = data.kpi?.accordsActifs;
  const courriers = data.kpi?.couriersSansReponse;
  const missions = data.kpi?.missionsEnCours;
  const traductions = asNumber(data.kpi?.traductionsEnAttente);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OperationalKpiCard
        label="Accords actifs"
        value={asNumber(accords?.total)}
        helper={
          asNumber(accords?.expiresNonTraites) > 0
            ? `${accords?.expiresNonTraites} expiré${asNumber(accords?.expiresNonTraites) > 1 ? 's' : ''}`
            : asNumber(accords?.enAlerte) > 0
              ? `${accords?.enAlerte} arrivent à échéance`
              : undefined
        }
        href="/accords"
        icon={Globe2}
        tone={asNumber(accords?.expiresNonTraites) > 0 ? 'red' : 'blue'}
      />
      <OperationalKpiCard
        label="Courriers sans réponse"
        value={asNumber(courriers?.total)}
        helper={
          asNumber(courriers?.critique) > 0
            ? `${courriers?.critique} critique${asNumber(courriers?.critique) > 1 ? 's' : ''}`
            : asNumber(courriers?.aSurveiller) > 0
              ? `${courriers?.aSurveiller} à surveiller`
              : undefined
        }
        href="/courriers"
        icon={Mail}
        tone={asNumber(courriers?.critique) > 0 ? 'red' : 'amber'}
      />
      <OperationalKpiCard
        label="Missions en cours"
        value={asNumber(missions?.total)}
        helper={
          asNumber(missions?.logistiqueNonConfirmee) > 0
            ? `${missions?.logistiqueNonConfirmee} logistique à confirmer`
            : undefined
        }
        href="/missions"
        icon={Plane}
        tone={asNumber(missions?.logistiqueNonConfirmee) > 0 ? 'amber' : 'blue'}
      />
      <OperationalKpiCard
        label="Traductions à traiter"
        value={traductions}
        helper={traductions > 0 ? `${traductions} prioritaire${traductions > 1 ? 's' : ''}` : undefined}
        href="/traductions"
        icon={traductions > 0 ? Languages : FileText}
        tone={traductions > 0 ? 'green' : 'blue'}
      />
    </section>
  );
}
