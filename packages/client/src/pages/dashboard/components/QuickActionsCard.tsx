import { FilePlus2, FolderPlus, Languages, MailPlus, PlaneTakeoff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { canAccessRoute } from '../dashboard.utils';
import type { UserRole } from '../dashboard.types';

const ACTIONS = [
  { label: 'Nouvel accord', href: '/accords/new', icon: FilePlus2 },
  { label: 'Courrier', href: '/courriers/new', icon: MailPlus },
  { label: 'Mission', href: '/missions/new', icon: PlaneTakeoff },
  { label: 'Traduction', href: '/traductions', icon: Languages },
  { label: 'Document', href: '/documents', icon: FolderPlus },
];

export function QuickActionsCard({ role }: { role?: UserRole }) {
  const actions = ACTIONS.filter((action) => canAccessRoute(role, action.href));

  return (
    <section className="card p-4" aria-labelledby="dashboard-actions-title">
      <h3 id="dashboard-actions-title" className="mb-4 text-base font-bold text-anac-navy">
        Actions rapides
      </h3>
      {actions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                to={action.href}
                className={index === 4 ? 'col-span-2' : undefined}
              >
                <span className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-anac-border bg-white px-3 text-sm font-medium text-anac-blue outline-none transition-colors hover:border-anac-sky hover:bg-anac-gray focus-visible:ring-2 focus-visible:ring-anac-sky">
                  <Icon size={16} aria-hidden="true" />
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-anac-muted">Aucune action disponible.</p>
      )}
    </section>
  );
}
