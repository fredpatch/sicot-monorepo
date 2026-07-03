/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
  Settings2,
  Info,
  History,
  CheckCircle2,
  XCircle,
  Play,
  Loader2Icon,
  Zap,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parametresApi, type ParametreType } from '@/lib/parametres.api';
import { jobsApi, traductionsApi } from '@/lib/api';
import { useAuth } from '@/App';

// ── Types ──────────────────────────────────────────────────────────────────
interface Parametre {
  id: number;
  cle: string;
  valeur: string;
  type: ParametreType;
  module: string;
  description?: string;
  modifiePar?: number;
  createdAt: string;
  updatedAt: string;
}

interface JobDisponible {
  cle: string;
  label: string;
  description: string;
  roleMinimum: 'admin' | 'super_admin';
  module: string;
}

interface JobResultat {
  cle: string;
  succes: boolean;
  resume: string;
  erreur?: string;
  dureeMs: number;
}

// ── Labels paramètres ──────────────────────────────────────────────────────
const PARAMETRE_LABELS: Record<string, string> = {
  otp_expiration_minutes: 'Expiration du code OTP',
  lockout_max_tentatives: 'Tentatives avant blocage',
  lockout_duree_minutes: 'Durée du blocage',
  backup_retention_locale_jours: 'Rétention sauvegarde locale',
  backup_retention_nas_jours: 'Rétention sauvegarde NAS',
  accord_alerte_jours: 'Alerte échéance accord',
  courrier_alerte_jours: 'Seuil courrier "à surveiller"',
  courrier_alerte_critique_jours: 'Seuil courrier "critique"',
  recommandation_alerte_jours: 'Alerte recommandation à risque',
  deepl_fallback_actif: 'Fallback traduction DeepL',
};

// ── Labels modules ─────────────────────────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  M1: 'Accords & Partenariats',
  M3: 'Missions & Recommandations',
  M4: 'Correspondances',
  NOTIF: 'Notifications',
  ADMIN: 'Administration',
  M10: 'Sécurité & Système',
};

// ── Déduire l'unité depuis la clé du paramètre ─────────────────────────────
function uniteDepuisCle(cle: string): string {
  if (cle.endsWith('_jours')) return 'jours';
  if (cle.endsWith('_minutes')) return 'min';
  return '';
}

// ── Ligne paramètre éditable ───────────────────────────────────────────────
function LigneParametre({
  parametre,
  onSave,
  saving,
  succes,
  deeplNonConfigure,
}: {
  parametre: Parametre;
  onSave: (cle: string, valeur: string) => void;
  saving: boolean;
  succes: boolean;
  deeplNonConfigure?: boolean;
}) {
  const [valeur, setValeur] = useState(parametre.valeur);
  const [modifie, setModifie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const succesInline = succes ? (
    <span className="text-[10px] text-green-600 font-medium">✓ Enregistré</span>
  ) : null;

  function handleChange(v: string) {
    setValeur(v);
    setModifie(v !== parametre.valeur);
    setErreur(null);
  }

  function handleSave() {
    if (parametre.type === 'entier' && !/^\d+$/.test(valeur)) {
      setErreur('Doit être un nombre entier positif.');
      return;
    }
    onSave(parametre.cle, valeur);
    setModifie(false);
  }

  const unite = uniteDepuisCle(parametre.cle);

  return (
    <div className="card p-3.5 flex flex-col gap-2.5 h-full">
      <div>
        <p className="text-sm font-semibold text-anac-navy leading-snug">
          {PARAMETRE_LABELS[parametre.cle] ?? parametre.cle}
        </p>
        {parametre.description && (
          <p className="text-xs text-anac-muted mt-0.5 leading-snug">{parametre.description}</p>
        )}
        {deeplNonConfigure && (
          <p className="text-[11px] text-orange-600 font-medium mt-1 flex items-center gap-1">
            <AlertTriangle size={11} className="shrink-0" />
            Activé mais DEEPL_API_KEY absent sur le microservice - le fallback échouera
            silencieusement
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto pt-1">
        {parametre.type === 'booleen' ? (
          <select
            value={valeur}
            onChange={(e) => handleChange(e.target.value)}
            className="input h-8 text-sm flex-1"
          >
            <option value="true">Activé</option>
            <option value="false">Désactivé</option>
          </select>
        ) : parametre.type === 'entier' ? (
          <div className="flex items-center gap-1.5 flex-1">
            <Input
              type="number"
              min={0}
              value={valeur}
              onChange={(e) => handleChange(e.target.value)}
              className="h-8 text-sm w-full text-right"
            />
            {unite && <span className="text-xs text-anac-muted shrink-0">{unite}</span>}
          </div>
        ) : (
          <Input
            type="text"
            value={valeur}
            onChange={(e) => handleChange(e.target.value)}
            className="h-8 text-sm flex-1"
          />
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!modifie || saving}
          className="h-8 px-2.5 gap-1 shrink-0"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-anac-muted/70 font-mono">{parametre.cle}</span>
        {succesInline}
      </div>

      {erreur && <p className="text-[11px] text-anac-danger">{erreur}</p>}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function AdminParametresPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [cleEnCours, setCleEnCours] = useState<string | null>(null);
  const [succesCle, setSuccesCle] = useState<string | null>(null);
  const [resultatsJobs, setResultatsJobs] = useState<Record<string, JobResultat>>({});
  const [jobEnCours, setJobEnCours] = useState<string | null>(null);

  // Requête liste jobs
  const { data: jobsDisponibles } = useQuery({
    queryKey: ['jobs-disponibles'],
    queryFn: async () => {
      const res = await jobsApi.lister();
      return res.data as JobDisponible[];
    },
  });

  // ── Requête liste paramètres ──────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['parametres'],
    queryFn: async () => {
      const res = await parametresApi.lister();
      return res.data as Parametre[];
    },
  });

  // ── Requête statut moteur traduction ───────────────────────────────
  const { data: moteurStatus } = useQuery({
    queryKey: ['moteur-status'],
    queryFn: async () => {
      const res = await traductionsApi.moteurStatus();
      return res.data as { accessible: boolean; deeplConfigure: boolean };
    },
  });

  // ── Mutation mise à jour ──────────────────────────────────────────────
  const mettreAJourMutation = useMutation({
    mutationFn: ({ cle, valeur }: { cle: string; valeur: string }) =>
      parametresApi.mettreAJour(cle, valeur),
    onMutate: ({ cle }) => setCleEnCours(cle),
    onSuccess: (_res, { cle }) => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
      setSuccesCle(cle);
      setTimeout(() => setSuccesCle(null), 2000);
    },
    onError: (err: unknown) => {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la mise à jour.'
      );
    },
    onSettled: () => setCleEnCours(null),
  });

  // Mutation exécution
  const executerJobMutation = useMutation({
    mutationFn: (cle: string) => jobsApi.executer(cle),
    onMutate: (cle) => setJobEnCours(cle),
    onSuccess: (res, cle) => {
      setResultatsJobs((prev) => ({ ...prev, [cle]: res.data as JobResultat }));
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: unknown, cle) => {
      const data = (err as { response?: { data?: JobResultat } })?.response?.data;
      setResultatsJobs((prev) => ({
        ...prev,
        [cle]: data ?? {
          cle,
          succes: false,
          resume: 'Erreur',
          erreur: 'Erreur inconnue',
          dureeMs: 0,
        },
      }));
    },
    onSettled: () => setJobEnCours(null),
  });

  function handleSave(cle: string, valeur: string) {
    mettreAJourMutation.mutate({ cle, valeur });
  }

  // ── Grouper par module ────────────────────────────────────────────────
  const parametresParModule = (data ?? []).reduce<Record<string, Parametre[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const modules = Object.keys(parametresParModule).sort();

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center">
          <Settings2 size={18} className="text-anac-navy" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Paramètres système</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            Seuils et règles métier configurables - réservé Super Admin
          </p>
        </div>
      </div>

      {/* ── Note explicative ─────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          Ces paramètres pilotent les seuils d&apos;alerte automatiques (échéances accords, retard
          courriers, recommandations à risque). Toute modification est tracée dans le journal
          d&apos;audit et prend effet au prochain cycle du cron (08h00).
        </p>
      </div>

      {/* ── Chargement ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-anac-muted">
          <Loader2 size={16} className="animate-spin mr-2" />
          {t('common.loading')}
        </div>
      ) : modules.length === 0 ? (
        <div className="text-center py-16 text-anac-muted text-sm">Aucun paramètre configuré.</div>
      ) : (
        modules.map((module) => (
          <div key={module} className="space-y-6 max-w-5xl">
            <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide px-1">
              {MODULE_LABELS[module] ?? module}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {parametresParModule[module].map((p) => (
                <LigneParametre
                  key={p.cle}
                  parametre={p}
                  onSave={handleSave}
                  saving={cleEnCours === p.cle && mettreAJourMutation.isPending}
                  succes={succesCle === p.cle}
                  deeplNonConfigure={
                    p.cle === 'deepl_fallback_actif' &&
                    p.valeur === 'true' &&
                    moteurStatus?.deeplConfigure === false
                  }
                />
              ))}
            </div>
          </div>
        ))
      )}

      <div className="space-y-2 pt-4 border-t border-anac-border">
        <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide px-1 flex items-center gap-1.5">
          <Zap size={12} />
          Jobs manuels - environnement de développement
        </p>
        <p className="text-xs text-anac-muted px-1 mb-2">
          Déclenche immédiatement un job normalement programmé en cron, utile en dev quand le
          serveur redémarre fréquemment.
        </p>

        <div className="card p-0 overflow-hidden divide-y divide-anac-border/60">
          {(jobsDisponibles ?? []).map((job) => {
            const resultat = resultatsJobs[job.cle];
            return (
              <div key={job.cle} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-anac-navy">{job.label}</p>
                    <p className="text-xs text-anac-muted mt-0.5">{job.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => executerJobMutation.mutate(job.cle)}
                    disabled={
                      jobEnCours === job.cle ||
                      (job.roleMinimum === 'super_admin' && user?.role !== 'super_admin')
                    }
                    className="gap-1.5 shrink-0"
                  >
                    {job.roleMinimum === 'super_admin' && user?.role !== 'super_admin' ? (
                      <span className="text-xs text-anac-muted">Super Admin requis</span>
                    ) : jobEnCours === job.cle ? (
                      <>
                        <Loader2Icon size={12} className="animate-spin" /> Exécution...
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Lancer
                      </>
                    )}
                  </Button>
                </div>

                {resultat && (
                  <div
                    className={`mt-2.5 text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${
                      resultat.succes ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {resultat.succes ? (
                      <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={13} className="shrink-0 mt-0.5" />
                    )}
                    <span>
                      {resultat.resume}
                      {resultat.erreur && ` — ${resultat.erreur}`}
                      <span className="text-anac-muted ml-1.5">({resultat.dureeMs}ms)</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
