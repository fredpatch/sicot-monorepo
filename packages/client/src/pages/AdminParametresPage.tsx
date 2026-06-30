/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Settings2, Info, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parametresApi, type ParametreType } from '@/lib/parametres.api';

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

// ── Labels modules ─────────────────────────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  M1: 'Accords & Partenariats',
  M3: 'Missions & Recommandations',
  M4: 'Correspondances',
  NOTIF: 'Notifications',
  ADMIN: 'Administration',
};

// ── Ligne paramètre éditable ───────────────────────────────────────────────
function LigneParametre({
  parametre,
  onSave,
  saving,
}: {
  parametre: Parametre;
  onSave: (cle: string, valeur: string) => void;
  saving: boolean;
}) {
  const [valeur, setValeur] = useState(parametre.valeur);
  const [modifie, setModifie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function handleChange(v: string) {
    setValeur(v);
    setModifie(v !== parametre.valeur);
    setErreur(null);
  }

  function handleSave() {
    // Validation côté client avant envoi
    if (parametre.type === 'entier' && !/^\d+$/.test(valeur)) {
      setErreur('Doit être un nombre entier positif.');
      return;
    }
    onSave(parametre.cle, valeur);
    setModifie(false);
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-anac-gray/30 transition-colors">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-anac-navy font-mono">{parametre.cle}</span>
        </div>
        {parametre.description && (
          <p className="text-xs text-anac-muted mt-0.5">{parametre.description}</p>
        )}
        {parametre.modifiePar && (
          <p className="text-[10px] text-anac-muted mt-1 flex items-center gap-1">
            <History size={9} />
            Modifié le {new Date(parametre.updatedAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Champ selon le type */}
        {parametre.type === 'booleen' ? (
          <select
            value={valeur}
            onChange={(e) => handleChange(e.target.value)}
            className="input h-8 text-sm w-28"
          >
            <option value="true">Activé</option>
            <option value="false">Désactivé</option>
          </select>
        ) : parametre.type === 'entier' ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              value={valeur}
              onChange={(e) => handleChange(e.target.value)}
              className="h-8 text-sm w-20 text-right"
            />
            <span className="text-xs text-anac-muted">jours</span>
          </div>
        ) : (
          <Input
            type="text"
            value={valeur}
            onChange={(e) => handleChange(e.target.value)}
            className="h-8 text-sm w-40"
          />
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!modifie || saving}
          className="h-8 px-2.5 gap-1"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        </Button>
      </div>

      {erreur && <p className="text-[11px] text-anac-danger absolute mt-10">{erreur}</p>}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function AdminParametresPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [cleEnCours, setCleEnCours] = useState<string | null>(null);
  const [succesCle, setSuccesCle] = useState<string | null>(null);

  // ── Requête liste paramètres ──────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['parametres'],
    queryFn: async () => {
      const res = await parametresApi.lister();
      return res.data as Parametre[];
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
    <div className="space-y-6 max-w-3xl">
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
          <div key={module} className="space-y-2">
            <p className="text-xs font-semibold text-anac-muted uppercase tracking-wide px-1">
              {MODULE_LABELS[module] ?? module}
            </p>
            <div className="card p-0 overflow-hidden divide-y divide-anac-border/60">
              {parametresParModule[module].map((p) => (
                <div key={p.cle} className="relative">
                  <LigneParametre
                    parametre={p}
                    onSave={handleSave}
                    saving={cleEnCours === p.cle && mettreAJourMutation.isPending}
                  />
                  {succesCle === p.cle && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-green-600 font-medium">
                      ✓ Enregistré
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
