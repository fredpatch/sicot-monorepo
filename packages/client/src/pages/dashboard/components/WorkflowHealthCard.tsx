import { ClipboardList, Languages, ListChecks } from 'lucide-react';

import type { DashboardData } from '../dashboard.types';
import {
  asNumber,
  completionRate,
  getRequestStatusTotal,
  statusLabel,
} from '../dashboard.utils';

export function WorkflowHealthCard({ data }: { data: DashboardData }) {
  const monthly = data.traductionsParMois ?? [];
  const totalReceived = monthly.reduce((sum, row) => sum + asNumber(row.total), 0);
  const approved = monthly.reduce((sum, row) => sum + asNumber(row.approuvees), 0);
  const pending = Math.max(0, totalReceived - approved);
  const rate = completionRate(totalReceived, approved);
  const requests = data.demandesParStatut ?? [];
  const recommendations = data.kpi?.recommandationsEnAttente;

  return (
    <section className="card p-4 lg:col-span-7" aria-labelledby="dashboard-workflows-title">
      <h3 id="dashboard-workflows-title" className="mb-4 text-base font-bold text-anac-navy">
        Suivi des dossiers
      </h3>

      <div className="divide-y divide-anac-border rounded-md border border-anac-border">
        <div className="grid gap-4 p-4 md:grid-cols-[10rem_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded bg-blue-50 text-anac-blue">
              <Languages size={17} aria-hidden="true" />
            </span>
            <strong className="text-sm text-anac-navy">Traductions</strong>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-anac-muted">
              <span>
                <strong className="block text-anac-navy tabular-nums">{totalReceived}</strong>
                reçues
              </span>
              <span>
                <strong className="block text-anac-navy tabular-nums">{approved}</strong>
                approuvées
              </span>
              <span>
                <strong className="block text-anac-navy tabular-nums">{pending}</strong>
                en attente
              </span>
              <span>
                <strong className="block text-anac-navy tabular-nums">{rate} %</strong>
                taux
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-anac-gray" aria-label={`Taux de traitement ${rate} %`}>
              <div className="h-full rounded bg-anac-blue" style={{ width: `${rate}%` }} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[10rem_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded bg-green-50 text-anac-success">
              <ClipboardList size={17} aria-hidden="true" />
            </span>
            <strong className="text-sm text-anac-navy">Demandes</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            {requests.length > 0 ? (
              requests.map((request) => (
                <span
                  key={request.statut}
                  className="rounded border border-anac-border bg-white px-3 py-2 text-xs text-anac-muted"
                >
                  {statusLabel(request.statut)}{' '}
                  <strong className="text-anac-navy tabular-nums">{request.total}</strong>
                </span>
              ))
            ) : (
              <span className="text-sm text-anac-muted">Aucune demande ouverte.</span>
            )}
            {requests.length > 0 && getRequestStatusTotal(requests, 'soumise') === 0 && (
              <span className="rounded border border-anac-border bg-anac-gray px-3 py-2 text-xs text-anac-muted">
                Soumises <strong className="text-anac-navy">0</strong>
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[10rem_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded bg-amber-50 text-anac-warning">
              <ListChecks size={17} aria-hidden="true" />
            </span>
            <strong className="text-sm text-anac-navy">Recommandations</strong>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-anac-blue">
              <strong className="tabular-nums">{asNumber(recommendations?.total)}</strong> en attente
            </span>
            <span className="text-anac-danger">
              <strong className="tabular-nums">{asNumber(recommendations?.depassees)}</strong> dépassées
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
