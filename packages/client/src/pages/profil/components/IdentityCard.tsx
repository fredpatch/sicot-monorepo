// packages/client/src/pages/profil/components/IdentityCard.tsx
import { Info } from 'lucide-react';
import { ROLES } from '@/pages/users/users.constants';
import type { MonProfil } from '../profil.types';

function formaterDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formaterDateHeure(iso: string | null): string {
  if (!iso) return 'Jamais connecté';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-anac-border py-2.5 last:border-b-0">
      <span className="text-xs font-medium text-anac-muted">{label}</span>
      <span className="text-sm text-anac-navy">{value}</span>
    </div>
  );
}

export function IdentityCard({ profil }: { profil: MonProfil }) {
  const initiales = `${profil.prenom[0] ?? ''}${profil.nom[0] ?? ''}`.toUpperCase();
  const roleLabel = ROLES.find((r) => r.value === profil.role)?.label ?? profil.role;
  const organisation = [profil.service, profil.direction].filter(Boolean).join(' - ');

  return (
    <div className="card max-w-lg space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-anac-navy text-lg font-bold text-white select-none">
          {initiales || '-'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-anac-navy">
              {profil.prenom} {profil.nom}
            </p>
            <span className="rounded border border-anac-border bg-anac-gray px-1.5 py-0.5 text-[10px] font-semibold text-anac-navy">
              {roleLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-anac-muted">{profil.email}</p>
        </div>
      </div>

      <div>
        <InfoRow label="Matricule" value={<span className="font-mono">{profil.matricule}</span>} />
        {profil.poste && <InfoRow label="Fonction / Poste" value={profil.poste} />}
        {organisation && <InfoRow label="Direction / Service" value={organisation} />}
        <InfoRow label="Membre depuis" value={formaterDate(profil.createdAt)} />
        <InfoRow label="Dernière connexion" value={formaterDateHeure(profil.derniereConnexion)} />
        <InfoRow
          label="Statut du compte"
          value={
            <span className={profil.actif ? 'badge-actif' : 'badge-expire'}>
              {profil.actif ? 'Actif' : 'Inactif'}
            </span>
          }
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-anac-border bg-anac-gray/60 px-3 py-2.5 text-xs text-anac-muted">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Pour modifier vos informations personnelles (nom, email, matricule...), veuillez contacter
          l&apos;administrateur système.
        </span>
      </div>
    </div>
  );
}
