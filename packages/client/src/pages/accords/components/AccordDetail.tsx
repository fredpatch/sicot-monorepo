/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Pencil,
  RefreshCw,
  FileText,
  Link2,
  ExternalLink,
  Building2,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { accordsApi, type AccordStatut } from '@/lib/accords.api';
import { documentsApi } from '@/lib/documents.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
  type: string;
}

interface Accord {
  id: number;
  reference: string;
  titre: string;
  statut: AccordStatut;
  dateSignature: string;
  dateExpiration?: string;
  parentId?: number;
  documentId?: number;
  partenaires: OrganisationResume[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface AccordDetailProps {
  accordId: number;
  onModifier: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formaterDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function LigneInfo({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-anac-muted w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-anac-navy">{valeur}</span>
    </div>
  );
}

// ── Badge statut ───────────────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: AccordStatut }) {
  const config: Record<AccordStatut, { label: string; classe: string }> = {
    actif: { label: 'Actif', classe: 'badge-actif' },
    expire: { label: 'Expiré', classe: 'badge-expire' },
    suspendu: { label: 'Suspendu', classe: 'badge-warning' },
    en_renouvellement: { label: 'En renouvellement', classe: 'badge-info' },
  };
  const { label, classe } = config[statut] ?? { label: statut, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}

// ── Composant principal ────────────────────────────────────────────────────
export default function AccordDetail({ accordId, onModifier }: AccordDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Requête accord ────────────────────────────────────────────────────
  const { data: accord, isLoading } = useQuery({
    queryKey: ['accord', accordId],
    queryFn: async () => {
      const res = await accordsApi.getById(accordId);
      return res.data as Accord;
    },
  });

  // ── Requête document lié ──────────────────────────────────────────────
  const { data: documentLie } = useQuery({
    queryKey: ['document', accord?.documentId],
    queryFn: async () => {
      const res = await documentsApi.getById(accord!.documentId!);
      return res.data as { id: number; nomOriginal: string; mimeType: string };
    },
    enabled: !!accord?.documentId,
  });

  // ── Requête accord parent (si renouvellement) ─────────────────────────
  const { data: accordParent } = useQuery({
    queryKey: ['accord', accord?.parentId],
    queryFn: async () => {
      const res = await accordsApi.getById(accord!.parentId!);
      return res.data as Accord;
    },
    enabled: !!accord?.parentId,
  });

  // ── Requête versions liées (renouvellements de cet accord) ───────────
  const { data: versionsData } = useQuery({
    queryKey: ['accords-versions', accordId],
    queryFn: async () => {
      // Lister les accords dont parentId = accordId
      const res = await accordsApi.lister({ pageSize: 50 });
      const tous = res.data as { data: Accord[] };
      return tous.data.filter((a) => a.parentId === accordId);
    },
    enabled: !!accord,
  });

  // ── Chargement ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-anac-muted">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (!accord) return null;

  const expirationProche =
    accord.dateExpiration &&
    accord.statut === 'actif' &&
    new Date(accord.dateExpiration) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const estExpire = accord.dateExpiration && new Date(accord.dateExpiration) < new Date();

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <BadgeStatut statut={accord.statut} />
            {accord.parentId && (
              <span className="text-xs text-anac-muted bg-anac-gray rounded px-2 py-0.5">
                Renouvellement
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-anac-navy leading-snug">{accord.titre}</h2>
          <p className="font-mono text-xs text-anac-muted">{accord.reference}</p>
        </div>

        <Button onClick={onModifier} variant="secondary" size="sm" className="gap-1.5 shrink-0">
          <Pencil size={13} /> Modifier
        </Button>
      </div>

      {/* ── Alerte expiration ─────────────────────────────────────────── */}
      {expirationProche && !estExpire && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm font-medium">
          ⚠ Cet accord expire le {formaterDate(accord.dateExpiration)} — pensez au renouvellement.
        </div>
      )}

      {estExpire && accord.statut !== 'en_renouvellement' && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-medium">
          ✕ Cet accord a expiré le {formaterDate(accord.dateExpiration)}.
        </div>
      )}

      {/* ── Informations générales ────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">Détails</p>

        <LigneInfo
          label="Date de signature"
          valeur={
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={12} className="text-anac-muted" />
              {formaterDate(accord.dateSignature)}
            </span>
          }
        />

        <LigneInfo
          label="Date d'expiration"
          valeur={
            accord.dateExpiration ? (
              <span
                className={
                  estExpire
                    ? 'text-red-600 font-semibold'
                    : expirationProche
                      ? 'text-amber-600 font-semibold'
                      : ''
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} className="text-anac-muted" />
                  {formaterDate(accord.dateExpiration)}
                </span>
              </span>
            ) : (
              <span className="text-anac-muted">Sans date d&apos;expiration</span>
            )
          }
        />

        {accord.notes && (
          <LigneInfo
            label="Notes"
            valeur={<span className="text-anac-text leading-relaxed">{accord.notes}</span>}
          />
        )}
      </div>

      {/* ── Partenaires ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
          Partenaires ({accord.partenaires.length})
        </p>
        <div className="space-y-2">
          {accord.partenaires.map((p) => (
            <div key={p.id} className="card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-anac-sky/10 flex items-center justify-center shrink-0">
                <Building2 size={14} className="text-anac-sky" />
              </div>
              <div>
                <p className="text-sm font-medium text-anac-navy">{p.nom}</p>
                <p className="text-xs text-anac-muted">{p.pays}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Document lié ──────────────────────────────────────────────── */}
      {documentLie && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
            Document de référence
          </p>
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-anac-muted shrink-0" />
              <div>
                <p className="text-sm font-medium text-anac-navy">{documentLie.nomOriginal}</p>
                <p className="text-xs text-anac-muted">
                  {documentLie.mimeType.split('/')[1]?.toUpperCase()}
                </p>
              </div>
            </div>

            <a
              href={`/api/documents/${documentLie.id}/telecharger`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-anac-sky hover:text-anac-navy transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink size={11} /> Consulter
            </a>
          </div>
        </div>
      )}

      {/* ── Accord parent (si renouvellement) ────────────────────────── */}
      {accordParent && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
            Accord d&apos;origine
          </p>
          <button
            onClick={() => navigate(`/accords/${accordParent.id}`)}
            className="card p-4 w-full text-left hover:bg-anac-gray/50 transition-colors space-y-1"
          >
            <div className="flex items-center gap-2">
              <BadgeStatut statut={accordParent.statut} />
              <span className="font-mono text-xs text-anac-muted">{accordParent.reference}</span>
            </div>
            <p className="text-sm font-medium text-anac-navy">{accordParent.titre}</p>
            <p className="text-xs text-anac-muted">
              Signé le {formaterDate(accordParent.dateSignature)}
            </p>
          </button>
        </div>
      )}

      {/* ── Versions / renouvellements ────────────────────────────────── */}
      {versionsData && versionsData.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
            Renouvellements ({versionsData.length})
          </p>
          <div className="space-y-2">
            {versionsData.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/accords/${v.id}`)}
                className="card p-4 w-full text-left hover:bg-anac-gray/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-anac-muted" />
                    <span className="font-mono text-xs text-anac-muted">{v.reference}</span>
                    <BadgeStatut statut={v.statut} />
                  </div>
                  <span className="text-xs text-anac-muted">{formaterDate(v.dateSignature)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Métadonnées ────────────────────────────────────────────────── */}
      <div className="text-xs text-anac-muted space-y-1 pt-2 border-t border-anac-border">
        <p>Créé le {formaterDate(accord.createdAt)}</p>
        <p>Modifié le {formaterDate(accord.updatedAt)}</p>
      </div>
    </div>
  );
}
