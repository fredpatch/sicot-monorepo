import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Archive,
  Languages,
  AlertCircle,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { traductionsApi, type TraductionStatut } from '@/lib/traductions.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface Traduction {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: 'fr_en' | 'en_fr';
  statut: TraductionStatut;
  moteurUtilise: string;
  traducteurId?: number;
  relecteurId?: number;
  createdAt: string;
  updatedAt: string;
}

interface SuggestionGlossaire {
  termeFr: string;
  termeEn: string;
  domaine?: string;
}

// ── Badge statut ───────────────────────────────────────────────────────────
function BadgeStatut({ statut }: { statut: TraductionStatut }) {
  const config: Record<TraductionStatut, { label: string; classe: string }> = {
    a_reviser: { label: 'À réviser', classe: 'badge-warning' },
    en_relecture: { label: 'En relecture', classe: 'badge-info' },
    approuvee: { label: 'Approuvée', classe: 'badge-actif' },
    archivee: { label: 'Archivée', classe: 'badge-expire' },
    manuelle_requise: { label: 'Manuelle requise', classe: 'badge-expire' },
  };
  const { label, classe } = config[statut];
  return <span className={classe}>{label}</span>;
}

// ── Composant principal ────────────────────────────────────────────────────
export default function TraductionEditeur() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const traductionId = parseInt(id!);

  // ── État éditeur ──────────────────────────────────────────────────────
  const [texteFinal, setTexteFinal] = useState('');
  const [modifie, setModifie] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionGlossaire[]>([]);
  const [afficherSuggestions, setAfficherSuggestions] = useState(false);
  const [selectionTexte, setSelectionTexte] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  // ── Requête traduction ────────────────────────────────────────────────
  const { data: traduction, isLoading } = useQuery({
    queryKey: ['traduction', traductionId],
    queryFn: async () => {
      const res = await traductionsApi.getById(traductionId);
      return res.data as Traduction;
    },
  });

  // Initialiser l'éditeur avec le texte IA ou le texte final existant
  useEffect(() => {
    if (traduction) {
      setTexteFinal(traduction.texteFinal ?? traduction.texteIA ?? '');
      setModifie(false);
    }
  }, [traduction]);

  // ── Suggestions glossaire au survol/sélection ─────────────────────────
  const chargerSuggestions = useCallback(
    async (texte: string) => {
      if (!texte.trim() || texte.length < 3 || !traduction) return;
      try {
        const res = await traductionsApi.suggestions(traductionId, texte);
        setSuggestions(res.data as SuggestionGlossaire[]);
        setAfficherSuggestions(res.data.length > 0);
      } catch {
        // Non bloquant
      }
    },
    [traductionId, traduction]
  );

  function handleSelectionTexte() {
    const selection = window.getSelection()?.toString().trim() ?? '';
    if (selection.length > 2) {
      setSelectionTexte(selection);
      chargerSuggestions(selection);
    } else {
      setAfficherSuggestions(false);
    }
  }

  // Appliquer une suggestion du glossaire dans l'éditeur
  function appliquerSuggestion(suggestion: SuggestionGlossaire) {
    if (!selectionTexte) return;

    const termeCible = traduction?.direction === 'fr_en' ? suggestion.termeEn : suggestion.termeFr;

    const nouveauTexte = texteFinal.replace(
      new RegExp(selectionTexte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      termeCible
    );

    setTexteFinal(nouveauTexte);
    setModifie(true);
    setAfficherSuggestions(false);
    setSuggestions([]);
  }

  // ── Mutations ─────────────────────────────────────────────────────────
  const sauvegarderMutation = useMutation({
    mutationFn: () => traductionsApi.sauvegarderCorrection(traductionId, texteFinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traduction', traductionId] });
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      setModifie(false);
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 2000);
    },
    onError: (err: unknown) => {
      setErreur(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la sauvegarde.'
      );
    },
  });

  const supprimerMutation = useMutation({
    mutationFn: () => traductionsApi.supprimer(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      navigate('/traductions');
    },
    onError: (err: unknown) => {
      setErreur(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la suppression.'
      );
    },
  });

  const approuverMutation = useMutation({
    mutationFn: () => traductionsApi.approuver(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traduction', traductionId] });
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
    },
    onError: (err: unknown) => {
      setErreur(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Erreur lors de l'approbation."
      );
    },
  });

  const archiverMutation = useMutation({
    mutationFn: () => traductionsApi.archiver(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      navigate('/traductions');
    },
    onError: (err: unknown) => {
      setErreur(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Erreur lors de l'archivage."
      );
    },
  });

  // ── Chargement ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (!traduction) return null;

  const estArchivee = traduction.statut === 'archivee';
  const estApprouvee = traduction.statut === 'approuvee';
  const estEditable = !estArchivee && !estApprouvee;

  const labelOriginal = traduction.direction === 'fr_en' ? 'Texte français' : 'English text';
  const labelTraduit =
    traduction.direction === 'fr_en' ? 'Traduction anglaise' : 'Traduction française';

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-0">
      {/* ── Barre d'actions ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-anac-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/traductions')}
            className="gap-1.5"
          >
            <ArrowLeft size={13} /> Retour
          </Button>

          <div className="flex items-center gap-2">
            <BadgeStatut statut={traduction.statut} />
            <span className="text-xs text-anac-muted font-mono">#{traductionId}</span>
            <span className="inline-flex items-center gap-1 text-xs text-anac-muted">
              <Languages size={11} />
              {traduction.direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
            </span>
          </div>
        </div>

        {/* Actions workflow */}
        <div className="flex items-center gap-2">
          {/* Indicateur sauvegarde */}
          {sauvegarde && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> Sauvegardé
            </span>
          )}

          {/* Sauvegarder correction */}
          {estEditable && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => sauvegarderMutation.mutate()}
              disabled={!modifie || sauvegarderMutation.isPending}
              className="gap-1.5"
            >
              {sauvegarderMutation.isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          )}

          {/* Approuver */}
          {(traduction.statut === 'a_reviser' ||
            traduction.statut === 'en_relecture' ||
            traduction.statut === 'manuelle_requise') && (
            <Button
              size="sm"
              onClick={() => {
                // Sauvegarder d'abord si modifié, puis approuver
                if (modifie) {
                  sauvegarderMutation.mutate(undefined, {
                    onSuccess: () => approuverMutation.mutate(),
                  });
                } else {
                  approuverMutation.mutate();
                }
              }}
              disabled={approuverMutation.isPending || !texteFinal.trim()}
              className="gap-1.5"
            >
              {approuverMutation.isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Approbation...
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} /> Approuver
                </>
              )}
            </Button>
          )}

          {/* Archiver */}
          {estApprouvee && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => archiverMutation.mutate()}
              disabled={archiverMutation.isPending}
              className="gap-1.5"
            >
              {archiverMutation.isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Archivage...
                </>
              ) : (
                <>
                  <Archive size={12} /> Archiver
                </>
              )}
            </Button>
          )}

          {!estArchivee && !estApprouvee && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm('Supprimer cette traduction ? Cette action est réversible.')) {
                  supprimerMutation.mutate();
                }
              }}
              disabled={supprimerMutation.isPending}
              className="gap-1.5 text-anac-muted hover:text-anac-danger hover:border-anac-danger"
            >
              {supprimerMutation.isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Erreur ───────────────────────────────────────────────────── */}
      {erreur && (
        <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {erreur}
          <button
            onClick={() => setErreur(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Alerte traduction manuelle requise ────────────────────────── */}
      {traduction.statut === 'manuelle_requise' && (
        <div className="mx-6 mt-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          LibreTranslate était inaccessible lors du lancement. Saisissez la traduction manuellement
          dans l&apos;éditeur ci-dessous.
        </div>
      )}

      {/* ── Éditeur côte-à-côte ───────────────────────────────────────── */}
      <div className="flex flex-1 gap-0 overflow-hidden px-6 py-4">
        {/* ── Panneau gauche : texte original ────────────────────────── */}
        <div className="flex-1 flex flex-col gap-2 pr-3 border-r border-anac-border overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <Label className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
              {labelOriginal}
            </Label>
            <span className="text-[11px] text-anac-muted">
              {traduction.texteOriginal?.length ?? 0} car.
            </span>
          </div>

          <div
            className="flex-1 overflow-y-auto border border-anac-border rounded-lg p-4 bg-anac-gray/30 text-sm text-anac-text leading-relaxed font-mono whitespace-pre-wrap select-text"
            onMouseUp={handleSelectionTexte}
          >
            {traduction.texteOriginal ?? (
              <span className="text-anac-muted italic">Aucun texte original.</span>
            )}
          </div>

          {/* Diff IA vs original si disponible */}
          {traduction.texteIA &&
            traduction.texteFinal &&
            traduction.texteIA !== traduction.texteFinal && (
              <div className="flex items-center gap-1.5 text-[11px] text-anac-muted shrink-0">
                <RefreshCw size={10} />
                Traduction modifiée par rapport à la version IA — delta sauvegardé dans M7
              </div>
            )}
        </div>

        {/* ── Panneau droit : traduction modifiable ───────────────────── */}
        <div className="flex-1 flex flex-col gap-2 pl-3 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <Label className="text-xs font-semibold text-anac-muted uppercase tracking-wide">
              {labelTraduit}
              {modifie && (
                <span className="ml-2 text-[10px] text-amber-500 font-normal normal-case">
                  • Modifications non sauvegardées
                </span>
              )}
            </Label>
            <span className="text-[11px] text-anac-muted">{texteFinal.length} car.</span>
          </div>

          <textarea
            value={texteFinal}
            onChange={(e) => {
              setTexteFinal(e.target.value);
              setModifie(true);
              setErreur(null);
            }}
            onMouseUp={handleSelectionTexte}
            disabled={estArchivee}
            className={`
              flex-1 border border-anac-border rounded-lg p-4 text-sm
              text-anac-text leading-relaxed font-mono resize-none
              focus:outline-none focus:ring-1 focus:ring-anac-sky
              ${estArchivee ? 'bg-anac-gray/30 cursor-not-allowed opacity-70' : 'bg-white'}
              ${estApprouvee ? 'bg-green-50/40 border-green-200' : ''}
            `}
            placeholder={
              estArchivee
                ? 'Traduction archivée — lecture seule.'
                : traduction.statut === 'manuelle_requise'
                  ? 'Saisissez la traduction manuellement...'
                  : 'Révisez la traduction ici...'
            }
          />

          {/* ── Panneau suggestions glossaire ──────────────────────── */}
          {afficherSuggestions && suggestions.length > 0 && (
            <div className="border border-anac-sky/30 rounded-lg bg-white shadow-sm shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-anac-border">
                <BookOpen size={12} className="text-anac-sky" />
                <span className="text-xs font-medium text-anac-navy">
                  Suggestions glossaire pour &quot;{selectionTexte}&quot;
                </span>
                <button
                  onClick={() => setAfficherSuggestions(false)}
                  className="ml-auto text-anac-muted hover:text-anac-navy text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="divide-y divide-anac-border/50 max-h-32 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => appliquerSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-anac-sky/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-anac-navy">
                        {traduction.direction === 'fr_en' ? s.termeFr : s.termeEn}
                      </span>
                      <span className="text-anac-muted text-xs">→</span>
                      <span className="text-xs text-anac-sky font-medium">
                        {traduction.direction === 'fr_en' ? s.termeEn : s.termeFr}
                      </span>
                      {s.domaine && (
                        <span className="text-[10px] text-anac-muted ml-auto">{s.domaine}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Barre de statut bas ───────────────────────────────────────── */}
      <div className="px-6 py-2 border-t border-anac-border bg-anac-gray/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs text-anac-muted">
          <span>Moteur : {traduction.moteurUtilise}</span>
          {traduction.documentId && <span>Document #{traduction.documentId}</span>}
          <span>Créé le {new Date(traduction.createdAt).toLocaleDateString('fr-FR')}</span>
        </div>

        {/* Raccourcis clavier */}
        {estEditable && (
          <div className="text-[11px] text-anac-muted">
            Sélectionnez du texte pour voir les suggestions du glossaire
          </div>
        )}
      </div>
    </div>
  );
}
