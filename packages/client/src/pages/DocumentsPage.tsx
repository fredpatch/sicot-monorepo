// packages/client/src/pages/DocumentsPage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { confirmToast } from '@/lib/confirm-toast';
import { documentsApi } from '@/lib/documents.api';
import { useAuth } from '@/App';

import { useDocumentsColumns } from './documents/documents.columns';
import { DocumentsMobileCards } from './documents/components/DocumentsMobileCards';
import { DocumentsSummaryCards } from './documents/components/DocumentsSummaryCards';
import { DocumentsUploadZone } from './documents/components/DocumentsUploadZone';
import { DocumentWorkspace } from './documents/components/DocumentWorkspace';
import { OcrCorrectionDialog } from './documents/components/OcrCorrectionDialog';
import { PortailDialog } from './documents/components/PortailDialog';
import { canManageDocuments } from './documents/documents.permissions';
import type { Categorie, Document } from './documents/documents.types';
import {
  PAGE_SIZE,
  useDocumentsAggregatesQuery,
  useDocumentsQuery,
} from './documents/hooks/queries';
import { useDocumentsMutations } from './documents/hooks/mutations';
import { DocumentsFiltres } from './documents/components/DocumentsFilters';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState<Categorie>('tous');
  const [statutOCR, setStatutOCR] = useState('');
  const [finalesUniquement, setFinalesUniquement] = useState(false);
  const [page, setPage] = useState(1);

  // ── État dialogs ──────────────────────────────────────────────────────
  const [documentOCR, setDocumentOCR] = useState<Document | null>(null);
  const [modalPortail, setModalPortail] = useState<Document | null>(null);
  const [documentSelectionne, setDocumentSelectionne] = useState<Document | null>(null);

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading } = useDocumentsQuery({
    search,
    categorie,
    statutOCR,
    page,
    finalesUniquement,
  });
  const { data: aggregates } = useDocumentsAggregatesQuery();

  // ── Mutations ─────────────────────────────────────────────────────────
  const {
    corrigerOCRMutation,
    categoriesMutation,
    togglePortailMutation,
    supprimerMutation,
    retraiterOCRMutation,
    nouvelleVersionMutation,
    toggleVisibiliteInterneMutation,
  } = useDocumentsMutations({
    onOCRCorrigee: () => setDocumentOCR(null),
    onPortailPublie: () => setModalPortail(null),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Partagés entre le registre (documents.columns.tsx) et le workspace du
  // document sélectionné (DocumentWorkspace.tsx) - une seule définition pour
  // chaque action, quel que soit l'endroit d'où elle est déclenchée.
  const onChangerCategorie = (id: number, cat: string) => categoriesMutation.mutate({ id, cat });
  const onTraduire = async (doc: Document) => {
    // Le listing ne renvoie plus texteExtrait (voir documents.types.ts) - on
    // charge le détail complet au moment du clic, uniquement pour ce
    // document, plutôt que de l'inclure sur chaque ligne du registre.
    const { data: detail } = await documentsApi.getById(doc.id);
    sessionStorage.setItem(
      'traduction_prefill',
      JSON.stringify({ documentId: doc.id, texte: detail.texteExtrait ?? '' })
    );
    navigate('/traductions');
  };
  const onSupprimer = (doc: Document) => {
    confirmToast(`Supprimer "${doc.nomOriginal}" ?`, () => supprimerMutation.mutate(doc.id));
  };
  const onRetirerPortail = (id: number) => togglePortailMutation.mutate({ id, visible: false });
  const onVerserVersion = (id: number, fichier: File) =>
    nouvelleVersionMutation.mutate({ id, fichier });

  const colonnes = useDocumentsColumns({
    t,
    role: user?.role,
    onCorrigerOCR: setDocumentOCR,
    onRetraiterOCR: (id) => retraiterOCRMutation.mutate(id),
    retraiterOCREnCours: retraiterOCRMutation.isPending,
    onTraduire,
    onSupprimer,
    supprimerEnCours: supprimerMutation.isPending,
    onOuvrirPortail: setModalPortail,
    onRetirerPortail,
    retirerPortailEnCours: togglePortailMutation.isPending,
    onVerserVersion,
    verserVersionEnCours: nouvelleVersionMutation.isPending,
    onToggleVisibiliteInterne: (id, visible) =>
      toggleVisibiliteInterneMutation.mutate({ id, visible }),
    toggleVisibiliteInterneEnCours: toggleVisibiliteInterneMutation.isPending,
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Gestion documentaire</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {canManageDocuments(user?.role)
              ? 'Consultez, recherchez et gérez les documents disponibles dans le système.'
              : 'Consultez les documents disponibles dans SICOT.'}
          </p>
        </div>

        {canManageDocuments(user?.role) && <DocumentsUploadZone />}
      </div>

      {/* ── Métriques ─────────────────────────────────────────────────── */}
      <DocumentsSummaryCards aggregates={aggregates} />

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <DocumentsFiltres
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        categorie={categorie}
        onCategorieChange={(v) => {
          setCategorie(v);
          setPage(1);
        }}
        statutOCR={statutOCR}
        onStatutOCRChange={(v) => {
          setStatutOCR(v);
          setPage(1);
        }}
        finalesUniquement={finalesUniquement}
        onFinalesUniquementChange={(v) => {
          setFinalesUniquement(v);
          setPage(1);
        }}
        onReset={() => {
          setSearch('');
          setCategorie('tous');
          setStatutOCR('');
          setFinalesUniquement(false);
          setPage(1);
        }}
        searchPlaceholder={t('common.search') + '...'}
      />

      {/* ── Tableau (desktop/tablette) ────────────────────────────────── */}
      <DataTable
        columns={colonnes}
        data={data?.data ?? []}
        isLoading={isLoading}
        loadingMessage={t('common.loading')}
        emptyMessage={t('common.noData')}
        onRowClick={setDocumentSelectionne}
        className="hidden md:block"
      />

      {/* ── Cartes (mobile) ───────────────────────────────────────────── */}
      {!isLoading && (data?.data.length ?? 0) > 0 && (
        <DocumentsMobileCards
          documents={data?.data ?? []}
          role={user?.role}
          onOpen={setDocumentSelectionne}
          onTraduire={onTraduire}
          onCorrigerOCR={setDocumentOCR}
          onRetraiterOCR={(id) => retraiterOCRMutation.mutate(id)}
          retraiterOCREnCours={retraiterOCRMutation.isPending}
          onVerserVersion={onVerserVersion}
          verserVersionEnCours={nouvelleVersionMutation.isPending}
          onOuvrirPortail={setModalPortail}
          onRetirerPortail={onRetirerPortail}
          retirerPortailEnCours={togglePortailMutation.isPending}
          onSupprimer={onSupprimer}
          supprimerEnCours={supprimerMutation.isPending}
        />
      )}
      {!isLoading && (data?.data.length ?? 0) === 0 && (
        <p className="py-12 text-center text-anac-muted md:hidden">{t('common.noData')}</p>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <DataTablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel={t('common.page')}
        ofLabel={t('common.of')}
      />

      {/* ── Dialog : Correction OCR ───────────────────────────────────── */}
      <OcrCorrectionDialog
        document={documentOCR}
        onOpenChange={(open) => !open && setDocumentOCR(null)}
        onSubmit={(texte) =>
          documentOCR && corrigerOCRMutation.mutate({ id: documentOCR.id, texte })
        }
        chargement={corrigerOCRMutation.isPending}
        t={t}
      />

      {/* ── Dialog : Portail ───────────────────────────────────────────── */}
      <PortailDialog
        document={modalPortail}
        onOpenChange={(open) => !open && setModalPortail(null)}
        onPublier={(duree) =>
          modalPortail &&
          togglePortailMutation.mutate({ id: modalPortail.id, visible: true, duree })
        }
        chargement={togglePortailMutation.isPending}
      />

      {/* ── Workspace : document sélectionné ──────────────────────────── */}
      <DocumentWorkspace
        document={documentSelectionne}
        role={user?.role}
        onOpenChange={(open) => !open && setDocumentSelectionne(null)}
        onChangerCategorie={onChangerCategorie}
        onCorrigerOCR={setDocumentOCR}
        onRetraiterOCR={(id) => retraiterOCRMutation.mutate(id)}
        retraiterOCREnCours={retraiterOCRMutation.isPending}
        onTraduire={onTraduire}
        onSupprimer={onSupprimer}
        supprimerEnCours={supprimerMutation.isPending}
        onOuvrirPortail={setModalPortail}
        onRetirerPortail={onRetirerPortail}
        retirerPortailEnCours={togglePortailMutation.isPending}
        onVerserVersion={onVerserVersion}
        verserVersionEnCours={nouvelleVersionMutation.isPending}
      />
    </div>
  );
}
