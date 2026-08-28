// packages/client/src/pages/portal/PortalPage.tsx
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { DataTablePagination } from '@/components/table/data-table-pagination';
import { PortalHeader } from './components/PortalHeader';
import { PortalHero } from './components/PortalHero';
import { PortalInfoCard } from './components/PortalInfoCard';
import { PortalCategoryCards } from './components/PortalCategoryCards';
import { PortalSearchBar } from './components/PortalSearchBar';
import { PortalDocumentsTable } from './components/PortalDocumentsTable';
import { PortalDocumentCard } from './components/PortalDocumentCard';
import { PortalDocumentViewer } from './components/PortalDocumentViewer';
import { DownloadRequestDialog } from './components/DownloadRequestDialog';
import { PortalEmptyState } from './components/PortalEmptyState';
import { PortalFooter } from './components/PortalFooter';
import { usePortalDocumentsQuery, usePortalAggregatesQuery } from './hooks/queries';
import { PORTAL_PAGE_SIZE, getPortalCategoryLabel } from './portal.constants';
import type { DocumentPortail } from './portal.types';

export default function PortalPage() {
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [page, setPage] = useState(1);

  const [documentViewer, setDocumentViewer] = useState<DocumentPortail | null>(null);
  const [documentDl, setDocumentDl] = useState<DocumentPortail | null>(null);

  const { data, isLoading } = usePortalDocumentsQuery({ search, categorie, page });
  const { data: aggregates, isLoading: aggregatesLoading } = usePortalAggregatesQuery();
  const totalPages = data ? Math.ceil(data.total / PORTAL_PAGE_SIZE) : 0;

  // Garde-fou pagination : si le total se réduit (document retiré du
  // portail pendant la session) et laisse la page courante hors plage,
  // revenir à la dernière page valide plutôt que montrer une page vide.
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCategorieChange(value: string) {
    setCategorie(value);
    setPage(1);
  }

  // Aucun document publié globalement (pas seulement pour le filtre actif) -
  // état vide simplifié, cartes de catégorie masquées (§31 du brief).
  const aucunDocumentGlobalement = !aggregatesLoading && (aggregates?.total ?? 0) === 0;

  const filtreActif = !!(search || categorie);
  let titreSection = 'Documents disponibles';
  let sousTitreSection: string | null = null;
  if (search) {
    titreSection = 'Résultats';
  } else if (categorie) {
    sousTitreSection = getPortalCategoryLabel(categorie);
  }

  return (
    <div className="min-h-screen bg-anac-gray flex flex-col">
      <PortalHeader />

      {/* Hero compact + carte de confiance en deux colonnes, recherche
          intégrée directement dans la bande - pas de bande blanche sticky
          séparée autour d'un petit champ. */}
      <div className="bg-anac-navy text-white py-10 px-6 lg:px-10">
        <div className="max-w-350 mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <PortalHero />
            </div>
            <div className="lg:col-span-1">
              <PortalInfoCard />
            </div>
          </div>

          <PortalSearchBar
            search={search}
            onSearchChange={handleSearchChange}
            categorieActive={!!categorie}
            onResetCategorie={() => handleCategorieChange('')}
          />
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-350 mx-auto px-6 lg:px-10 py-8 space-y-8">
          {!aucunDocumentGlobalement && (
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-anac-muted">
                  Parcourir par catégorie
                </h2>
                {categorie && (
                  <button
                    type="button"
                    onClick={() => handleCategorieChange('')}
                    className="text-xs font-medium text-anac-sky hover:underline"
                  >
                    Toutes les catégories
                  </button>
                )}
              </div>
              <PortalCategoryCards categorieActive={categorie} onSelect={handleCategorieChange} />
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-anac-navy">
              {titreSection}
              {sousTitreSection && <span className="text-anac-muted"> - {sousTitreSection}</span>}
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-anac-muted">
                  {data?.total ?? 0} document{(data?.total ?? 0) > 1 ? 's' : ''}
                </span>
              )}
            </h2>

            {aucunDocumentGlobalement ? (
              <PortalEmptyState variant="global" />
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20 text-anac-muted">
                <Loader2 size={20} className="animate-spin mr-2" />
                Chargement...
              </div>
            ) : data?.data.length === 0 ? (
              <PortalEmptyState
                variant={categorie ? 'categorie' : 'filtre'}
                categorieLabel={categorie ? getPortalCategoryLabel(categorie) : undefined}
                onReset={
                  filtreActif
                    ? () => {
                        handleSearchChange('');
                        handleCategorieChange('');
                      }
                    : undefined
                }
              />
            ) : (
              <>
                <PortalDocumentsTable
                  documents={data?.data ?? []}
                  onConsulter={setDocumentViewer}
                  onTelecharger={setDocumentDl}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                  {data?.data.map((doc) => (
                    <PortalDocumentCard
                      key={doc.id}
                      doc={doc}
                      onConsulter={() => setDocumentViewer(doc)}
                      onTelecharger={() => setDocumentDl(doc)}
                    />
                  ))}
                </div>
              </>
            )}

            <DataTablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageLabel="Page"
              ofLabel="sur"
            />
          </section>
        </div>
      </main>

      <PortalFooter />

      {documentViewer && (
        <PortalDocumentViewer
          document={documentViewer}
          onClose={() => setDocumentViewer(null)}
          onTelechargement={() => {
            setDocumentDl(documentViewer);
            setDocumentViewer(null);
          }}
        />
      )}

      <DownloadRequestDialog document={documentDl} onClose={() => setDocumentDl(null)} />
    </div>
  );
}
