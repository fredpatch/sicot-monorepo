/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Reply,
  Archive,
  Paperclip,
  Link2,
  FileText,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  courriersApi,
  type CourrierDirection,
  type CourrierSuiviStatut,
} from '@/lib/courriers.api';
import { accordsApi, documentsApi } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

// ── Types ──────────────────────────────────────────────────────────────────
interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
}

interface Courrier {
  id: number;
  reference: string;
  referenceExpediteur?: string;
  direction: CourrierDirection;
  objet: string;
  expediteur?: OrganisationResume;
  destinataire?: OrganisationResume;
  dateReception: string;
  reponseRequise: 'oui' | 'non' | 'pour_information';
  dateLimiteReponse?: string;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface CourrierDetailProps {
  courrierId: number;
  onRetour: () => void;
  onModifier: () => void;
  onRepondre: () => void;
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
      <span className="text-xs text-anac-muted w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-anac-navy">{valeur}</span>
    </div>
  );
}

// ── Badge direction ────────────────────────────────────────────────────────
function BadgeDirection({ direction }: { direction: CourrierDirection }) {
  if (direction === 'entrant') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">
        <ArrowDownLeft size={11} /> Courrier entrant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 rounded-full px-2.5 py-1">
      <ArrowUpRight size={11} /> Courrier sortant
    </span>
  );
}

// ── Badge suivi ────────────────────────────────────────────────────────────
function BadgeSuivi({ statut }: { statut: CourrierSuiviStatut }) {
  const config: Record<CourrierSuiviStatut, { label: string; classe: string }> = {
    en_attente: { label: 'En attente', classe: 'badge-warning' },
    repondu: { label: 'Répondu', classe: 'badge-actif' },
    archive: { label: 'Archivé', classe: 'badge-expire' },
  };
  const { label, classe } = config[statut];
  return <span className={classe}>{label}</span>;
}

// ── Badge réponse requise ──────────────────────────────────────────────────
function BadgeReponse({ valeur }: { valeur: string }) {
  if (valeur === 'oui') return <span className="badge-warning">Réponse requise</span>;
  if (valeur === 'pour_information') return <span className="badge-info">Pour information</span>;
  return <span className="badge-expire">Sans réponse</span>;
}

// ── Composant principal ────────────────────────────────────────────────────
export default function CourrierDetail({
  courrierId,
  onRetour,
  onModifier,
  onRepondre,
}: CourrierDetailProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── Requête courrier principal ────────────────────────────────────────
  const { data: courrier, isLoading } = useQuery({
    queryKey: ['courrier', courrierId],
    queryFn: async () => {
      const res = await courriersApi.getById(courrierId);
      return res.data as Courrier;
    },
  });

  // ── Requête document lié ─────────────────────────────────────────────
  const { data: documentLie } = useQuery({
    queryKey: ['document', courrier?.documentId],
    queryFn: async () => {
      const res = await documentsApi.getById(courrier!.documentId!);
      return res.data as { id: number; nomOriginal: string; mimeType: string; taille: number };
    },
    enabled: !!courrier?.documentId,
  });

  // ── Requête fil de correspondance ─────────────────────────────────────
  const { data: fil } = useQuery({
    queryKey: ['courrier-fil', courrierId],
    queryFn: async () => {
      const res = await courriersApi.getFilCorrespondance(courrierId);
      return res.data as Courrier[];
    },
    enabled: !!courrier,
  });

  // ── Requête courrier parent (si ce courrier est une réponse) ──────────
  const { data: courrierParent } = useQuery({
    queryKey: ['courrier', courrier?.reponseAId],
    queryFn: async () => {
      const res = await courriersApi.getById(courrier!.reponseAId!);
      return res.data as Courrier;
    },
    enabled: !!courrier?.reponseAId,
  });

  // ── Requête accord lié (si applicable) ─────────────────────────────────
  const { data: accordLie } = useQuery({
    queryKey: ['accord', courrier?.accordId],
    queryFn: async () => {
      const res = await accordsApi.getById(courrier!.accordId!);
      return res.data as { id: number; reference: string; titre: string };
    },
    enabled: !!courrier?.accordId,
  });

  // ── Mutation archiver ─────────────────────────────────────────────────
  const archiverMutation = useMutation({
    mutationFn: () => courriersApi.mettreAJour(courrierId, { suiviStatut: 'archive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courriers'] });
      queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
    },
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

  if (!courrier) return null;

  const dateLimitDepassee =
    courrier.dateLimiteReponse &&
    courrier.suiviStatut === 'en_attente' &&
    new Date(courrier.dateLimiteReponse) < new Date();

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Barre d'actions ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-anac-border bg-white shrink-0">
        {/* Retour — visible sur mobile seulement */}
        <Button variant="secondary" size="sm" onClick={onRetour} className="gap-1.5 md:hidden">
          <ArrowLeft size={13} /> Retour
        </Button>
        <div className="hidden md:block" /> {/* spacer desktop */}
        {/* Actions */}
        <div className="flex items-center gap-2">
          {courrier.direction === 'entrant' && courrier.suiviStatut !== 'archive' && (
            <Button variant="secondary" size="sm" onClick={onRepondre} className="gap-1.5">
              <Reply size={13} /> Répondre
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={onModifier} className="gap-1.5">
            <Pencil size={13} /> Modifier
          </Button>

          {courrier.suiviStatut !== 'archive' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => archiverMutation.mutate()}
              disabled={archiverMutation.isPending}
              className="gap-1.5"
            >
              {archiverMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Archive size={13} />
              )}
              Archiver
            </Button>
          )}
        </div>
      </div>

      {/* ── Corps scrollable ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {/* ── En-tête courrier ───────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <BadgeDirection direction={courrier.direction} />
              <BadgeSuivi statut={courrier.suiviStatut} />
              <BadgeReponse valeur={courrier.reponseRequise} />
            </div>

            <h2 className="text-lg font-bold text-anac-navy leading-snug">{courrier.objet}</h2>

            <p className="font-mono text-xs text-anac-muted">{courrier.reference}</p>
          </div>

          {/* ── Alerte date limite dépassée ────────────────────────────── */}
          {dateLimitDepassee && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-medium">
              ⚠ Date limite de réponse dépassée — {formaterDate(courrier.dateLimiteReponse)}
            </div>
          )}

          {/* ── Informations ───────────────────────────────────────────── */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">Détails</p>

            <LigneInfo
              label="Expéditeur"
              valeur={
                courrier.expediteur ? (
                  <span>
                    {courrier.expediteur.nom}{' '}
                    <span className="text-anac-muted text-xs">· {courrier.expediteur.pays}</span>
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <LigneInfo
              label="Destinataire"
              valeur={
                courrier.destinataire ? (
                  <span>
                    {courrier.destinataire.nom}{' '}
                    <span className="text-anac-muted text-xs">· {courrier.destinataire.pays}</span>
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <LigneInfo label="Date de réception" valeur={formaterDate(courrier.dateReception)} />

            {courrier.dateLimiteReponse && (
              <LigneInfo
                label="Date limite"
                valeur={
                  <span className={dateLimitDepassee ? 'text-red-600 font-semibold' : ''}>
                    {formaterDate(courrier.dateLimiteReponse)}
                  </span>
                }
              />
            )}

            {courrier.referenceExpediteur && (
              <LigneInfo
                label="Réf. expéditeur"
                valeur={<span className="font-mono text-xs">{courrier.referenceExpediteur}</span>}
              />
            )}

            {courrier.accordId && (
              <LigneInfo
                label="Accord lié"
                valeur={
                  <button
                    onClick={() => navigate(`/accords/${courrier.accordId}`)}
                    className="inline-flex items-center gap-1 text-anac-sky hover:text-anac-navy transition-colors text-sm"
                  >
                    <Link2 size={11} />
                    {accordLie
                      ? `${accordLie.reference} - ${accordLie.titre}`
                      : `Accord #${courrier.accordId}`}
                  </button>
                }
              />
            )}

            {courrier.missionId && (
              <LigneInfo
                label="Mission liée"
                valeur={
                  <span className="inline-flex items-center gap-1 text-anac-sky text-xs">
                    <Link2 size={11} /> Mission #{courrier.missionId}
                  </span>
                }
              />
            )}

            {documentLie && (
              <LigneInfo
                label="Document joint"
                valeur={
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <FileText size={13} className="text-anac-muted shrink-0" />
                      <span className="text-anac-navy font-medium">{documentLie.nomOriginal}</span>
                      <span className="text-anac-muted text-xs">
                        · {documentLie.mimeType.split('/')[1].toUpperCase()}
                      </span>
                    </span>

                    <a
                      href={`/api/documents/${documentLie.id}/telecharger`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-anac-sky hover:text-anac-navy transition-colors inline-flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Consulter
                    </a>
                  </div>
                }
              />
            )}
          </div>

          {/* ── Courrier parent (si réponse à) ────────────────────────── */}
          {courrierParent && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
                En réponse à
              </p>
              <div className="card p-4 border-l-4 border-anac-sky/40 space-y-1">
                <div className="flex items-center gap-2">
                  <BadgeDirection direction={courrierParent.direction} />
                  <span className="font-mono text-xs text-anac-muted">
                    {courrierParent.reference}
                  </span>
                </div>
                <p className="text-sm font-medium text-anac-navy">{courrierParent.objet}</p>
                <p className="text-xs text-anac-muted">
                  {formaterDate(courrierParent.dateReception)}
                  {courrierParent.expediteur && ` · ${courrierParent.expediteur.nom}`}
                </p>
              </div>
            </div>
          )}

          {/* ── Fil de correspondance ──────────────────────────────────── */}
          {fil && fil.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
                Fil de correspondance ({fil.length})
              </p>
              <div className="space-y-2">
                {fil.map((rep) => (
                  <div key={rep.id} className="card p-4 border-l-4 border-violet-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BadgeDirection direction={rep.direction} />
                        <span className="font-mono text-xs text-anac-muted">{rep.reference}</span>
                      </div>
                      <span className="text-xs text-anac-muted">
                        {formaterDate(rep.dateReception)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-anac-navy">{rep.objet}</p>
                    {rep.destinataire && (
                      <p className="text-xs text-anac-muted">À : {rep.destinataire.nom}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Métadonnées ────────────────────────────────────────────── */}
          <div className="text-xs text-anac-muted space-y-1 pt-2 border-t border-anac-border">
            <p>Créé le {formaterDate(courrier.createdAt)}</p>
            <p>Modifié le {formaterDate(courrier.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
