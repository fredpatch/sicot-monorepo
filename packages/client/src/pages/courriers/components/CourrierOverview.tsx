import { Link } from 'react-router-dom';
import { Check, FileText, Send } from 'lucide-react';

import type { Courrier } from '../courrier.types';
import { formatCourrierDate, formatCourrierDeadline, getCourrierContact, getCourrierInterlocutor } from '../courrier.utils';
import { COURRIER_REPONSE_LABELS } from '../courrier.constants';

// The three real columns from the Phase 2 plan §5 — Informations clés /
// Suivi (the real 3-state lifecycle, no invented stages) / Documents &
// Réponse — answering "what's the state of this courrier and what's next?"
export function CourrierOverview({ courrier }: { courrier: Courrier }) {
  const interlocuteur = getCourrierInterlocutor(courrier);
  const contact = getCourrierContact(courrier);
  const interlocuteurLabel = courrier.direction === 'entrant' ? 'Expéditeur' : 'Destinataire';

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Informations clés</h3>
        <dl className="mt-4 grid gap-4 text-sm">
          <DetailRow label="Référence" value={courrier.reference} />
          {courrier.referenceExpediteur && (
            <DetailRow label="Réf. expéditeur" value={courrier.referenceExpediteur} />
          )}
          <DetailRow label="Objet" value={courrier.objet} />
          <DetailRow
            label={interlocuteurLabel}
            value={interlocuteur ? `${interlocuteur.nom} (${interlocuteur.pays})` : 'Non renseigné'}
          />
          {contact && (
            <DetailRow label="Contact" value={`${contact.prenom} ${contact.nom}${contact.poste ? ` · ${contact.poste}` : ''}`} />
          )}
          <DetailRow label="Date" value={formatCourrierDate(courrier.dateReception, 'long')} />
          <DetailRow label="Réponse requise" value={COURRIER_REPONSE_LABELS[courrier.reponseRequise]} />
        </dl>
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Suivi</h3>
        <CourrierLifecycle courrier={courrier} />
        {courrier.dateLimiteReponse && courrier.suiviStatut === 'en_attente' && (
          <div className="mt-4 rounded-md border border-anac-border bg-anac-gray px-3 py-2.5 text-sm">
            <p className="text-xs text-anac-muted">Délai de réponse</p>
            <p className="mt-0.5 font-semibold text-anac-navy">
              {formatCourrierDate(courrier.dateLimiteReponse)} — {formatCourrierDeadline(courrier)}
            </p>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Documents / Réponse</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-anac-muted">
              <FileText size={13} aria-hidden="true" />
              Documents
            </dt>
            <dd className="font-medium text-anac-navy">
              {courrier.documents.length > 0 ? `${courrier.documents.length} joint(s)` : 'Aucun'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-anac-muted">
              <Send size={13} aria-hidden="true" />
              Courrier lié
            </dt>
            <dd className="font-medium text-anac-navy">
              {courrier.reponseAId ? 'Réponse à un courrier' : 'Aucun'}
            </dd>
          </div>
        </dl>
        <Link
          to={`/courriers/${courrier.id}?section=documents`}
          className="mt-4 inline-block text-sm text-anac-blue hover:underline"
        >
          Voir les documents et la réponse
        </Link>
      </section>
    </div>
  );
}

// The real 3-state lifecycle (Créé → En attente → Répondu | Archivé) — no
// invented stages, matches courrier.utils.ts's getCourrierLifecycleState.
function CourrierLifecycle({ courrier }: { courrier: Courrier }) {
  const steps: { key: string; label: string; done: boolean; current: boolean }[] = [
    { key: 'cree', label: 'Créé', done: true, current: false },
    {
      key: 'en_attente',
      label: 'En attente',
      done: courrier.suiviStatut !== 'en_attente',
      current: courrier.suiviStatut === 'en_attente',
    },
    {
      key: 'final',
      label: courrier.suiviStatut === 'archive' ? 'Archivé' : 'Répondu',
      done: courrier.suiviStatut === 'repondu' || courrier.suiviStatut === 'archive',
      current: courrier.suiviStatut === 'repondu' || courrier.suiviStatut === 'archive',
    },
  ];

  return (
    <ol className="mt-4 space-y-0">
      {steps.map((step, index) => (
        <li key={step.key} className="grid grid-cols-[18px_1fr] gap-3">
          <span className="relative flex justify-center">
            {index > 0 && <span className="absolute top-0 h-3 w-px bg-anac-border" />}
            <span
              className={`mt-3 flex size-2.5 items-center justify-center rounded-full border-2 ${
                step.done || step.current ? 'border-anac-blue bg-anac-blue' : 'border-anac-border bg-white'
              }`}
            >
              {step.done && <Check size={7} className="text-white" aria-hidden="true" />}
            </span>
            {index < steps.length - 1 && <span className="absolute bottom-0 top-5 w-px bg-anac-border" />}
          </span>
          <span className="pb-4">
            <span
              className={`block text-sm font-semibold ${
                step.current ? 'text-anac-blue' : step.done ? 'text-anac-navy' : 'text-anac-muted'
              }`}
            >
              {step.label}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-medium text-anac-muted">{label}</dt>
      <dd className="text-anac-navy">{value}</dd>
    </div>
  );
}
