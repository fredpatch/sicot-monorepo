import { FileText, Globe2, Languages, Mail, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  activityHref,
  formatRelativeDate,
} from '../dashboard.utils';
import type { ActiviteRecente } from '../dashboard.types';

const ICONS = {
  accord: Globe2,
  courrier: Mail,
  mission: Plane,
  traduction: Languages,
  default: FileText,
};

function activityLabel(type: string) {
  const labels: Record<string, string> = {
    accord: 'Accord modifié',
    courrier: 'Courrier enregistré',
    mission: 'Mission enregistrée',
    traduction: 'Traduction ajoutée',
  };
  return labels[type] ?? type;
}

export function RecentActivityList({ activities }: { activities: ActiviteRecente[] }) {
  const visible = activities.slice(0, 5);

  return (
    <section className="card p-4" aria-labelledby="dashboard-activity-title">
      <h3 id="dashboard-activity-title" className="mb-4 text-base font-bold text-anac-navy">
        Dernières activités
      </h3>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-anac-muted">Aucune activité récente.</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-md border border-anac-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-anac-gray text-xs font-semibold text-anac-navy">
                <tr>
                  <th className="px-4 py-2">Activité</th>
                  <th className="px-4 py-2">Référence</th>
                  <th className="px-4 py-2">Utilisateur</th>
                  <th className="px-4 py-2">Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-anac-border">
                {visible.map((activity, index) => {
                  const Icon = ICONS[activity.type as keyof typeof ICONS] ?? ICONS.default;
                  const href = activityHref(activity);
                  const row = (
                    <>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <Icon size={15} className="text-anac-blue" aria-hidden="true" />
                          {activityLabel(activity.type)}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-anac-blue">
                        {activity.reference}
                      </td>
                      <td className="px-4 py-2 text-anac-muted">-</td>
                      <td className="px-4 py-2 text-anac-muted">{formatRelativeDate(activity.date)}</td>
                    </>
                  );

                  return (
                    <tr key={`${activity.reference}-${index}`} className="hover:bg-anac-gray/60">
                      {href ? (
                        <td colSpan={4} className="p-0">
                          <Link
                            to={href}
                            className="grid grid-cols-[1.5fr_1fr_1fr_1fr] outline-none focus-visible:ring-2 focus-visible:ring-anac-sky [&>span]:px-4 [&>span]:py-2"
                          >
                            <span>
                              <span className="inline-flex items-center gap-2">
                                <Icon size={15} className="text-anac-blue" aria-hidden="true" />
                                {activityLabel(activity.type)}
                              </span>
                            </span>
                            <span className="font-mono text-xs text-anac-blue">
                              {activity.reference}
                            </span>
                            <span className="text-anac-muted">-</span>
                            <span className="text-anac-muted">{formatRelativeDate(activity.date)}</span>
                          </Link>
                        </td>
                      ) : (
                        row
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {visible.map((activity, index) => {
              const Icon = ICONS[activity.type as keyof typeof ICONS] ?? ICONS.default;
              const href = activityHref(activity);
              const content = (
                <span className="flex items-center justify-between gap-3 rounded-md border border-anac-border px-3 py-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-anac-navy">
                      <Icon size={15} className="text-anac-blue" aria-hidden="true" />
                      {activityLabel(activity.type)}
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs text-anac-blue">
                      {activity.reference}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-anac-muted">
                    {formatRelativeDate(activity.date)}
                  </span>
                </span>
              );

              return href ? (
                <Link
                  key={`${activity.reference}-${index}`}
                  to={href}
                  className="block outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
                >
                  {content}
                </Link>
              ) : (
                <div key={`${activity.reference}-${index}`}>{content}</div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
