// packages/client/src/pages/DocumentsPage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DataTable } from '@/components/table/data-table';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { confirmToast } from '@/lib/confirm-toast';

import { useDocumentsColumns } from './documents/documents.columns';
import { DocumentsUploadZone } from './documents/components/DocumentsUploadZone';
import { OcrCorrectionDialog } from './documents/components/OcrCorrectionDialog';
import { PortailDialog } from './documents/components/PortailDialog';
import type { Categorie, Document } from './documents/documents.types';
import { PAGE_SIZE, useDocumentsQuery } from './documents/hooks/queries';
import { useDocumentsMutations } from './documents/hooks/mutations';
import { DocumentsFiltres } from './documents/components/DocumentsFilters';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState<Categorie>('tous');
  const [statutOCR, setStatutOCR] = useState('');
  const [page, setPage] = useState(1);

  // ── État dialogs ──────────────────────────────────────────────────────
  const [documentOCR, setDocumentOCR] = useState<Document | null>(null);
  const [modalPortail, setModalPortail] = useState<Document | null>(null);

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading } = useDocumentsQuery({ search, categorie, statutOCR, page });

  // ── Mutations ─────────────────────────────────────────────────────────
  const {
    corrigerOCRMutation,
    categoriesMutation,
    togglePortailMutation,
    supprimerMutation,
    retraiterOCRMutation,
  } = useDocumentsMutations({
    onOCRCorrigee: () => setDocumentOCR(null),
    onPortailPublie: () => setModalPortail(null),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const colonnes = useDocumentsColumns({
    t,
    onChangerCategorie: (id, cat) => categoriesMutation.mutate({ id, cat }),
    onCorrigerOCR: setDocumentOCR,
    onRetraiterOCR: (id) => retraiterOCRMutation.mutate(id),
    retraiterOCREnCours: retraiterOCRMutation.isPending,
    onTraduire: (doc) => {
      sessionStorage.setItem(
        'traduction_prefill',
        JSON.stringify({ documentId: doc.id, texte: doc.texteExtrait ?? '' })
      );
      navigate('/traductions');
    },
    onSupprimer: (doc) => {
      confirmToast(`Supprimer "${doc.nomOriginal}" ?`, () => supprimerMutation.mutate(doc.id));
    },
    supprimerEnCours: supprimerMutation.isPending,
    onOuvrirPortail: setModalPortail,
    onRetirerPortail: (id) => togglePortailMutation.mutate({ id, visible: false }),
    retirerPortailEnCours: togglePortailMutation.isPending,
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Gestion Documentaire</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} document{(data?.total ?? 0) > 1 ? 's' : ''} archivé
            {(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>

        <DocumentsUploadZone />
      </div>

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
        onReset={() => {
          setSearch('');
          setCategorie('tous');
          setStatutOCR('');
          setPage(1);
        }}
        searchPlaceholder={t('common.search') + '...'}
      />

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <DataTable
        columns={colonnes}
        data={data?.data ?? []}
        isLoading={isLoading}
        loadingMessage={t('common.loading')}
        emptyMessage={t('common.noData')}
      />

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
    </div>
  );
}
