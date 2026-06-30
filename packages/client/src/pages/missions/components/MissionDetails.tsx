import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Pencil,
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  FileText,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
} from 'lucide-react';

import ModalRelance from '@/components/ModalRelance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { missionsApi, type MissionStatut, type RecommandationStatut } from '@/lib/missions.api';
import { documentsApi } from '@/lib/documents.api';
import { usersApi } from '@/lib/users.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface ParticipantResume {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string; // ← ajouter
}

interface RecommandationView {
  id: number;
  missionId: number;
  texte: string;
  responsableId?: number;
  responsable?: ParticipantResume;
  dateLimite?: string;
  statut: RecommandationStatut;
  createdAt: string;
  updatedAt: string;
}

interface Mission {
  id: number;
  titre: string;
  destination: string;
  pays: string;
  dateDebut: string;
  dateFin: string;
  statut: MissionStatut;
  participants: ParticipantResume[];
  recommandations?: RecommandationView[];
  rapportDocumentId?: number;
  createdAt: string;
  updatedAt: string;

  confirmationLogistique: 'a_planifier' | 'en_cours' | 'confirme';
  contactSurPlace?: {
    id: number;
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
    poste?: string;
    organisationNom?: string;
  };
}

interface User {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface MissionDetailProps {
  missionId: number;
  onRetour: () => void;
  onModifier: () => void;
}

// ── Schema recommandation ──────────────────────────────────────────────────
const recSchema = z.object({
  texte: z.string().min(1, 'Le texte est requis'),
  responsableId: z.number().optional(),
  dateLimite: z.string().optional(),
});
type RecFormData = z.infer<typeof recSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────
function formaterDate(iso?: string) {
  if (!iso) return '-';
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

// ─ Badge logistique ─────────────────────────────────────────────────────
function BadgeLogistique({ statut }: { statut: 'a_planifier' | 'en_cours' | 'confirme' }) {
  const config = {
    a_planifier: { label: 'Logistique à planifier', classe: 'badge-expire' },
    en_cours: { label: 'Logistique en cours', classe: 'badge-warning' },
    confirme: { label: 'Logistique confirmée', classe: 'badge-actif' },
  };
  const { label, classe } = config[statut];
  return <span className={classe}>{label}</span>;
}

// ── Badge statut mission ───────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: MissionStatut }) {
  const config: Record<MissionStatut, { label: string; classe: string }> = {
    planifiee: { label: 'Planifiée', classe: 'badge-info' },
    en_cours: { label: 'En cours', classe: 'badge-warning' },
    terminee: { label: 'Terminée', classe: 'badge-actif' },
    annulee: { label: 'Annulée', classe: 'badge-expire' },
  };
  const { label, classe } = config[statut];
  return <span className={classe}>{label}</span>;
}

// ── Badge statut recommandation ────────────────────────────────────────────
function BadgeRec({ statut }: { statut: RecommandationStatut }) {
  const config: Record<RecommandationStatut, { label: string; icone: React.ReactNode }> = {
    en_attente: {
      label: 'En attente',
      icone: <Clock size={11} className="text-amber-500" />,
    },
    en_cours: {
      label: 'En cours',
      icone: <AlertCircle size={11} className="text-blue-500" />,
    },
    realisee: {
      label: 'Réalisée',
      icone: <CheckCircle2 size={11} className="text-green-500" />,
    },
  };
  const { label, icone } = config[statut];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-anac-muted">
      {icone} {label}
    </span>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function MissionDetail({ missionId, onRetour, onModifier }: MissionDetailProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [recommandationRelance, setRecommandationRelance] = useState<RecommandationView | null>(
    null
  );

  const [ajouterRec, setAjouterRec] = useState(false);

  // ── Requête mission ───────────────────────────────────────────────────
  const { data: mission, isLoading } = useQuery({
    queryKey: ['mission', missionId],
    queryFn: async () => {
      const res = await missionsApi.getById(missionId);
      return res.data as Mission;
    },
  });

  // ── Requête rapport document ──────────────────────────────────────────
  const { data: rapport } = useQuery({
    queryKey: ['document', mission?.rapportDocumentId],
    queryFn: async () => {
      const res = await documentsApi.getById(mission!.rapportDocumentId!);
      return res.data as { id: number; nomOriginal: string; mimeType: string };
    },
    enabled: !!mission?.rapportDocumentId,
  });

  // ── Requête liste agents (pour sélecteur responsable) ─────────────────
  const { data: usersData } = useQuery({
    queryKey: ['users-liste'],
    queryFn: async () => {
      const res = await usersApi.lister({ pageSize: 200 });
      return res.data as { data: User[] };
    },
    enabled: ajouterRec,
  });
  const agents = usersData?.data ?? [];

  // ── Formulaire recommandation ─────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset: resetRec,
    setValue: setRecValue,
    watch: watchRec,
    formState: { errors: recErrors },
  } = useForm<RecFormData>({
    resolver: zodResolver(recSchema),
    defaultValues: { texte: '', dateLimite: '' },
  });

  const responsableIdWatched = watchRec('responsableId');

  // ── Mutation ajouter recommandation ───────────────────────────────────
  const ajouterRecMutation = useMutation({
    mutationFn: (data: RecFormData) =>
      missionsApi.ajouterRecommandation(missionId, {
        texte: data.texte,
        responsableId: data.responsableId,
        dateLimite: data.dateLimite || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      setAjouterRec(false);
      resetRec();
    },
  });

  // ── Mutation changer statut recommandation ────────────────────────────
  const changerStatutRecMutation = useMutation({
    mutationFn: ({ recId, statut }: { recId: number; statut: RecommandationStatut }) =>
      missionsApi.mettreAJourRecommandation(recId, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
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

  if (!mission) return null;

  const recommandations = mission.recommandations ?? [];
  const recEnAttente = recommandations.filter((r) => r.statut !== 'realisee').length;

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Barre d'actions ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-anac-border bg-white shrink-0">
        <Button variant="secondary" size="sm" onClick={onRetour} className="gap-1.5 md:hidden">
          <ArrowLeft size={13} /> Retour
        </Button>
        <div className="hidden md:block" />

        <Button
          variant="secondary"
          size="sm"
          onClick={onModifier}
          className="gap-1.5"
          disabled={mission.statut === 'annulee'}
        >
          <Pencil size={13} /> Modifier
        </Button>
      </div>

      {/* ── Corps scrollable ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {/* ── En-tête ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <BadgeStatut statut={mission.statut} />
              {mission.statut !== 'terminee' && mission.statut !== 'annulee' && (
                <BadgeLogistique statut={mission.confirmationLogistique} />
              )}
            </div>
            <h2 className="text-lg font-bold text-anac-navy leading-snug">{mission.titre}</h2>
            <div className="flex items-center gap-1.5 text-anac-muted text-sm">
              <MapPin size={13} />
              {mission.destination}, {mission.pays}
            </div>
          </div>

          {/* ── Alerte rapport manquant ───────────────────────────────── */}
          {mission.statut === 'terminee' && !mission.rapportDocumentId && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm font-medium">
              ⚠ Mission terminée - aucun rapport de mission déposé.
            </div>
          )}

          {/* ── Alerte logistique non confirmée ────────────────────────── */}
          {mission.confirmationLogistique !== 'confirme' &&
            mission.statut === 'planifiee' &&
            new Date(mission.dateDebut) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) && (
              <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg px-4 py-3 text-sm font-semibold">
                ⚠ Départ dans moins de 14 jours - logistique non confirmée (billet/financement).
              </div>
            )}

          {/* ── Informations générales ────────────────────────────────── */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">Détails</p>

            <LigneInfo
              label="Dates"
              valeur={
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} className="text-anac-muted" />
                  {formaterDate(mission.dateDebut)} → {formaterDate(mission.dateFin)}
                </span>
              }
            />

            <LigneInfo
              label="Destination"
              valeur={
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} className="text-anac-muted" />
                  {mission.destination}, {mission.pays}
                </span>
              }
            />
          </div>

          {/* ── Participants ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
              Participants ({mission.participants.length})
            </p>
            {mission.participants.length === 0 ? (
              <p className="text-sm text-anac-muted">Aucun participant enregistré.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mission.participants.map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-2 bg-anac-gray rounded-lg px-3 py-1.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-anac-sky/20 flex items-center justify-center shrink-0">
                      <Users size={11} className="text-anac-sky" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-anac-navy">
                        {p.prenom} {p.nom}
                      </span>
                      <span className="text-[10px] text-anac-muted ml-1">{p.matricule}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Contact sur place ───────────────────────────────────────── */}
          {mission.contactSurPlace && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
                Contact sur place
              </p>
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-anac-navy">
                    {mission.contactSurPlace.prenom} {mission.contactSurPlace.nom}
                  </p>
                  {mission.contactSurPlace.organisationNom && (
                    <p className="text-xs text-anac-muted">
                      {mission.contactSurPlace.organisationNom}
                    </p>
                  )}
                  {mission.contactSurPlace.poste && (
                    <p className="text-xs text-anac-muted">{mission.contactSurPlace.poste}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {mission.contactSurPlace.email && (
                      <a
                        href={`mailto:${mission.contactSurPlace.email}`}
                        className="text-xs text-anac-sky hover:text-anac-navy"
                      >
                        {mission.contactSurPlace.email}
                      </a>
                    )}
                    {mission.contactSurPlace.telephone && (
                      <span className="text-xs text-anac-muted">
                        {mission.contactSurPlace.telephone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Rapport de mission ────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
              Rapport de mission
            </p>
            {rapport ? (
              <div className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-anac-muted shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-anac-navy">{rapport.nomOriginal}</p>
                    <p className="text-xs text-anac-muted">
                      {rapport.mimeType.split('/')[1]?.toUpperCase()}
                    </p>
                  </div>
                </div>

                <a
                  href={`/api/documents/${rapport.id}/telecharger`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-anac-sky hover:text-anac-navy transition-colors inline-flex items-center gap-1"
                >
                  <ExternalLink size={11} /> Consulter
                </a>
              </div>
            ) : (
              <p className="text-sm text-anac-muted">
                Aucun rapport déposé.{' '}
                {mission.statut !== 'annulee' && (
                  <button
                    onClick={onModifier}
                    className="text-anac-sky hover:text-anac-navy transition-colors underline"
                  >
                    Déposer un rapport
                  </button>
                )}
              </p>
            )}
          </div>

          {/* ── Recommandations ───────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
                Recommandations
                {recEnAttente > 0 && (
                  <span className="ml-2 text-[11px] font-normal text-amber-600">
                    {recEnAttente} en cours
                  </span>
                )}
              </p>
              {mission.statut !== 'annulee' && !ajouterRec && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAjouterRec(true)}
                  className="gap-1.5 h-7 text-xs"
                >
                  <Plus size={11} /> Ajouter
                </Button>
              )}
            </div>

            {/* Formulaire nouvelle recommandation */}
            {ajouterRec && (
              <div className="card p-4 border-2 border-anac-sky/20 space-y-3">
                <p className="text-sm font-medium text-anac-navy">Nouvelle recommandation</p>
                <form
                  onSubmit={handleSubmit((data) => ajouterRecMutation.mutate(data))}
                  noValidate
                  className="space-y-3"
                >
                  {/* Texte */}
                  <div className="space-y-1.5">
                    <Label htmlFor="rec-texte">Recommandation *</Label>
                    <textarea
                      id="rec-texte"
                      {...register('texte')}
                      rows={3}
                      className="input resize-none text-sm"
                      placeholder="Décrivez la recommandation..."
                      aria-invalid={!!recErrors.texte}
                    />
                    {recErrors.texte && (
                      <p className="text-[11px] text-anac-danger">{recErrors.texte.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Responsable */}
                    <div className="space-y-1.5">
                      <Label>Responsable</Label>
                      <Select
                        value={responsableIdWatched?.toString() ?? '__none__'}
                        onValueChange={(v) =>
                          setRecValue('responsableId', v === '__none__' ? undefined : parseInt(v))
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="- Aucun -" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">- Aucun -</SelectItem>
                          {agents.map((u) => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.prenom} {u.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date limite */}
                    <div className="space-y-1.5">
                      <Label htmlFor="rec-date">Date limite</Label>
                      <Input
                        id="rec-date"
                        type="date"
                        {...register('dateLimite')}
                        className="text-sm"
                      />
                      <p className="text-[10px] text-anac-muted">
                        Sans date limite = pas d&apos;alerte
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setAjouterRec(false);
                        resetRec();
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={ajouterRecMutation.isPending}
                      className="gap-1.5"
                    >
                      {ajouterRecMutation.isPending ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Enregistrement...
                        </>
                      ) : (
                        'Ajouter'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Liste recommandations */}
            {recommandations.length === 0 && !ajouterRec ? (
              <p className="text-sm text-anac-muted">Aucune recommandation enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {recommandations.map((rec) => {
                  const depasse =
                    rec.dateLimite &&
                    rec.statut !== 'realisee' &&
                    new Date(rec.dateLimite) < new Date();

                  return (
                    <div
                      key={rec.id}
                      className={`card p-4 space-y-2 border-l-4 ${
                        rec.statut === 'realisee'
                          ? 'border-green-300 opacity-70'
                          : depasse
                            ? 'border-red-400'
                            : 'border-anac-sky/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-sm text-anac-navy leading-snug ${
                            rec.statut === 'realisee' ? 'line-through text-anac-muted' : ''
                          }`}
                        >
                          {rec.texte}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Changement de statut rapide */}
                          <Select
                            value={rec.statut}
                            onValueChange={(v) =>
                              changerStatutRecMutation.mutate({
                                recId: rec.id,
                                statut: v as RecommandationStatut,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-32 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en_attente">En attente</SelectItem>
                              <SelectItem value="en_cours">En cours</SelectItem>
                              <SelectItem value="realisee">Réalisée</SelectItem>
                            </SelectContent>
                          </Select>

                          {rec.statut !== 'realisee' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setRecommandationRelance(rec)}
                              className="h-7 px-2 gap-1 text-xs shrink-0"
                            >
                              <Send size={11} /> Relancer
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <BadgeRec statut={rec.statut} />

                        {rec.responsable && (
                          <span className="text-[11px] text-anac-muted">
                            Responsable : {rec.responsable.prenom} {rec.responsable.nom}
                          </span>
                        )}

                        {rec.dateLimite && (
                          <span
                            className={`text-[11px] font-medium ${
                              depasse ? 'text-red-600' : 'text-anac-muted'
                            }`}
                          >
                            {depasse ? '⚠ ' : ''}Échéance : {formaterDate(rec.dateLimite)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Métadonnées ────────────────────────────────────────────── */}
          <div className="text-xs text-anac-muted space-y-1 pt-2 border-t border-anac-border">
            <p>Créé le {formaterDate(mission.createdAt)}</p>
            <p>Modifié le {formaterDate(mission.updatedAt)}</p>
          </div>
        </div>
      </div>

      {recommandationRelance && (
        <ModalRelance
          open={!!recommandationRelance}
          onClose={() => setRecommandationRelance(null)}
          type="recommandation_rappel"
          entiteId={recommandationRelance.id}
          objetParDefaut={`Rappel - Recommandation mission "${mission?.titre}"`}
          messageParDefaut={
            `La recommandation suivante nécessite votre attention :` +
            `\n\n"${recommandationRelance.texte}"` +
            (recommandationRelance.dateLimite
              ? `\n\nDate limite : ${new Date(recommandationRelance.dateLimite).toLocaleDateString('fr-FR')}`
              : '') +
            `\n\nMerci de nous tenir informés de l'avancement.`
          }
          destinatairesSuggeres={
            recommandationRelance.responsable?.email
              ? [
                  {
                    label: `${recommandationRelance.responsable.prenom} ${recommandationRelance.responsable.nom}`,
                    email: recommandationRelance.responsable.email,
                    nom: `${recommandationRelance.responsable.prenom} ${recommandationRelance.responsable.nom}`,
                  },
                ]
              : []
          }
        />
      )}
    </div>
  );
}
