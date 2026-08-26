import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

import { useConfirm } from '@/components/ui/confirm-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { traductionsApi } from '@/lib/traductions.api';
import { documentsApi } from '@/lib/documents.api';
import { WorkshopHeader } from './editor/WorkshopHeader';
import { SourceTextPanel } from './editor/SourceTextPanel';
import { TranslationPanel } from './editor/TranslationPanel';
import { AssistancePanel } from './editor/AssistancePanel';
import type { SuggestionGlossaire } from './editor/GlossarySuggestions';
import type { Traduction } from '../traductions.types';
import { useMoteurStatusQuery } from '../hooks/queries';

function extractMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

export default function TraductionEditeur() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
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

  const { data: moteur } = useMoteurStatusQuery();

  // ── Requête traduction ────────────────────────────────────────────────
  const { data: traduction, isLoading } = useQuery({
    queryKey: ['traduction', traductionId],
    queryFn: async () => {
      const res = await traductionsApi.getById(traductionId);
      return res.data as Traduction;
    },
  });

  useEffect(() => {
    if (traduction) {
      setTexteFinal(traduction.texteFinal ?? traduction.texteIA ?? '');
      setModifie(false);
    }
  }, [traduction]);

  // ── Protection des modifications non sauvegardées (navigation in-app) ──
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      modifie && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    (async () => {
      const quitter = await confirm({
        title: 'Quitter sans enregistrer les modifications ?',
        description: 'Vos corrections seront perdues.',
        confirmLabel: 'Quitter',
        variant: 'destructive',
      });
      if (quitter) blocker.proceed();
      else blocker.reset();
    })();
  }, [blocker, confirm]);

  // ── Protection à la fermeture/actualisation du navigateur ──────────────
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!modifie) return;
      e.preventDefault();
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [modifie]);

  // ── Suggestions glossaire au survol/sélection ─────────────────────────
  const chargerSuggestions = useCallback(
    async (texte: string, origine: 'source' | 'traduction') => {
      if (!texte.trim() || texte.length < 3 || !traduction) return;
      try {
        const res = await traductionsApi.suggestions(traductionId, texte, origine);
        setSuggestions(res.data as SuggestionGlossaire[]);
        setAfficherSuggestions(res.data.length > 0);
      } catch {
        // Non bloquant
      }
    },
    [traductionId, traduction]
  );

  // Le panneau d'origine détermine la langue à chercher dans le glossaire —
  // sélectionner dans le panneau traduction cherche la langue cible, pas la
  // langue source de la traduction (voir traduction.controller.ts § suggestions).
  function handleSelectionTexte(origine: 'source' | 'traduction') {
    const selection = window.getSelection()?.toString().trim() ?? '';
    if (selection.length > 2) {
      setSelectionTexte(selection);
      chargerSuggestions(selection, origine);
    } else {
      setAfficherSuggestions(false);
    }
  }

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
      queryClient.invalidateQueries({ queryKey: ['traductions-aggregates'] });
      setModifie(false);
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 2000);
    },
    onError: (err: unknown) => setErreur(extractMessage(err, 'Erreur lors de la sauvegarde.')),
  });

  const relancerMutation = useMutation({
    mutationFn: () => traductionsApi.relancer(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traduction', traductionId] });
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      queryClient.invalidateQueries({ queryKey: ['traductions-aggregates'] });
    },
    onError: (err: unknown) => setErreur(extractMessage(err, 'Erreur lors de la relance.')),
  });

  const supprimerMutation = useMutation({
    mutationFn: () => traductionsApi.supprimer(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      queryClient.invalidateQueries({ queryKey: ['traductions-aggregates'] });
      navigate('/traductions');
    },
    onError: (err: unknown) => setErreur(extractMessage(err, 'Erreur lors de la suppression.')),
  });

  const approuverMutation = useMutation({
    mutationFn: () => traductionsApi.approuver(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traduction', traductionId] });
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      queryClient.invalidateQueries({ queryKey: ['traductions-aggregates'] });
    },
    onError: (err: unknown) => setErreur(extractMessage(err, "Erreur lors de l'approbation.")),
  });

  const archiverMutation = useMutation({
    mutationFn: () => traductionsApi.archiver(traductionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traductions'] });
      queryClient.invalidateQueries({ queryKey: ['traductions-aggregates'] });
      navigate('/traductions');
    },
    onError: (err: unknown) => setErreur(extractMessage(err, "Erreur lors de l'archivage.")),
  });

  // Dépose le fichier officiel dans le dossier documentaire, catégorisé
  // 'traduction' — rend la traduction découvrable par n'importe quel
  // utilisateur interne, pas seulement le demandeur d'origine. Nouvelle
  // version du document source s'il existe (traduction.documentId), sinon
  // un document autonome (traduction lancée depuis un texte libre).
  const deposerDocumentMutation = useMutation({
    mutationFn: (fichier: File) =>
      traduction?.documentId
        ? documentsApi.nouvelleVersion(traduction.documentId, fichier, 'traduction')
        : documentsApi.upload(fichier, 'traduction'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document déposé dans le dossier documentaire.');
    },
    onError: (err: unknown) => setErreur(extractMessage(err, 'Erreur lors du dépôt du document.')),
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
  const peutApprouver =
    traduction.statut === 'a_reviser' ||
    traduction.statut === 'en_relecture' ||
    traduction.statut === 'manuelle_requise';
  // Désactivé si des modifications locales non sauvegardées existent — la relance
  // ne touche que texteIA côté serveur, mais réinitialiser texteFinal depuis le
  // nouveau texteIA écraserait sinon un brouillon manuel en cours de saisie.
  const peutRelancer = traduction.statut === 'manuelle_requise' && moteur?.accessible === true && !modifie;

  function handleApprove() {
    if (modifie) {
      sauvegarderMutation.mutate(undefined, { onSuccess: () => approuverMutation.mutate() });
    } else {
      approuverMutation.mutate();
    }
  }

  const originalPanel = (
    <SourceTextPanel traduction={traduction} onSelection={() => handleSelectionTexte('source')} />
  );
  const translationPanel = (
    <TranslationPanel
      traduction={traduction}
      texteFinal={texteFinal}
      onChange={(texte) => {
        setTexteFinal(texte);
        setModifie(true);
        setErreur(null);
      }}
      onSelection={() => handleSelectionTexte('traduction')}
      modifie={modifie}
      estArchivee={estArchivee}
      estApprouvee={estApprouvee}
    />
  );
  const assistancePanel = (
    <AssistancePanel
      traduction={traduction}
      moteurAccessible={moteur?.accessible}
      direction={traduction.direction}
      selectionTexte={selectionTexte}
      suggestions={suggestions}
      afficherSuggestions={afficherSuggestions}
      onApplySuggestion={appliquerSuggestion}
      onCloseSuggestions={() => setAfficherSuggestions(false)}
    />
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <WorkshopHeader
        traduction={traduction}
        modifie={modifie}
        sauvegarde={sauvegarde}
        estEditable={estEditable}
        estApprouvee={estApprouvee}
        estArchivee={estArchivee}
        peutApprouver={peutApprouver}
        peutApprouverTexte={texteFinal.trim().length > 0}
        onSave={() => sauvegarderMutation.mutate()}
        saveEnCours={sauvegarderMutation.isPending}
        onApprove={handleApprove}
        approveEnCours={approuverMutation.isPending}
        onArchive={() => archiverMutation.mutate()}
        archiveEnCours={archiverMutation.isPending}
        onDelete={() => supprimerMutation.mutate()}
        deleteEnCours={supprimerMutation.isPending}
        peutRelancer={peutRelancer}
        onRelancer={() => relancerMutation.mutate()}
        relanceEnCours={relancerMutation.isPending}
        onDeposerDocument={(fichier) => deposerDocumentMutation.mutate(fichier)}
        deposerEnCours={deposerDocumentMutation.isPending}
      />

      {erreur && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-anac-danger shrink-0">
          <AlertCircle size={14} className="shrink-0" />
          {erreur}
          <button onClick={() => setErreur(null)} className="ml-auto text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {traduction.statut === 'manuelle_requise' && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-anac-warning shrink-0">
          <AlertCircle size={14} className="shrink-0" />
          Traduction manuelle requise — le moteur de traduction n&apos;a pas pu produire de résultat.
          Le texte source est conservé ; saisissez la traduction dans le panneau de droite, puis
          sauvegardez et approuvez-la.
        </div>
      )}

      {/* ── Desktop : original / traduction / assistance côte-à-côte ──── */}
      <div className="hidden flex-1 gap-4 overflow-hidden px-6 py-4 lg:grid lg:grid-cols-12">
        <div className="col-span-5 overflow-hidden">{originalPanel}</div>
        <div className="col-span-5 overflow-hidden">{translationPanel}</div>
        <div className="col-span-2 overflow-hidden">{assistancePanel}</div>
      </div>

      {/* ── Medium : original + traduction côte-à-côte, assistance en dessous ── */}
      <div className="hidden flex-1 flex-col gap-4 overflow-y-auto px-6 py-4 md:flex lg:hidden">
        <div className="grid flex-1 grid-cols-2 gap-4 min-h-[320px]">
          {originalPanel}
          {translationPanel}
        </div>
        {assistancePanel}
      </div>

      {/* ── Mobile : onglets ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:hidden">
        <Tabs defaultValue="original">
          <TabsList variant="line">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="traduction">Traduction</TabsTrigger>
            <TabsTrigger value="assistance">Assistance</TabsTrigger>
          </TabsList>
          <TabsContent value="original" className="h-[60vh]">
            {originalPanel}
          </TabsContent>
          <TabsContent value="traduction" className="h-[60vh]">
            {translationPanel}
          </TabsContent>
          <TabsContent value="assistance">{assistancePanel}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
