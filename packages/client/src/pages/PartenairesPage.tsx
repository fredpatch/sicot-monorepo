import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { SortingState } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/table/data-table';

import { usePartenairesColumns } from './partenaires/partenaires.columns';
import {
  useOrganisationsQuery,
  usePaysDisponiblesQuery,
  useRegionsDisponiblesQuery,
  useContactsOrganisationQuery,
} from './partenaires/hooks/usePartenairesQueries';
import { usePartenairesMutations } from './partenaires/hooks/usePartenairesMutations';
import { PartenairesFiltres } from './partenaires/components/PartenairesFiltres';
import { PartenairesPagination } from './partenaires/components/PartenairesPagination';
import { OrganisationDialog } from './partenaires/components/OrganisationDialog';
import { ContactsDialog } from './partenaires/components/ContactsDialog';
import type { Organisation, OrganisationSortField, OrganisationTypeFiltre } from './partenaires/partenaires.types';

export default function PartenairesPage() {
  const { t } = useTranslation();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [pays, setPays] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState<OrganisationTypeFiltre>('tous');
  const [page, setPage] = useState(1);

  // ── Tri ───────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const sortBy = sorting[0]?.id as OrganisationSortField | undefined;
  const sortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  // ── État modals ───────────────────────────────────────────────────────
  const [modalOrg, setModalOrg] = useState<'creer' | 'modifier' | null>(null);
  const [orgSelectionnee, setOrgSelectionnee] = useState<Organisation | null>(null);
  const [modalContact, setModalContact] = useState(false);
  const [voirContacts, setVoirContacts] = useState<Organisation | null>(null);

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading } = useOrganisationsQuery({ search, pays, region, type, page, sortBy, sortOrder });
  const { data: paysDisponibles } = usePaysDisponiblesQuery();
  const { data: regionsDisponibles } = useRegionsDisponiblesQuery();
  const { data: contactsOrg } = useContactsOrganisationQuery(voirContacts?.id);

  // ── Mutations ─────────────────────────────────────────────────────────
  const { creerOrgMutation, modifierOrgMutation, creerContactMutation, definirPrincipalMutation } =
    usePartenairesMutations({
      voirContactsId: voirContacts?.id,
      onOrganisationCreee: () => setModalOrg(null),
      onOrganisationModifiee: () => {
        setModalOrg(null);
        setOrgSelectionnee(null);
      },
      onContactCree: () => setModalContact(false),
    });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const colonnes = usePartenairesColumns({
    t,
    onEdit: (org) => {
      setOrgSelectionnee(org);
      setModalOrg('modifier');
    },
    onViewContacts: (org) => setVoirContacts(org),
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Partenaires Internationaux</h2>
          <p className="text-anac-muted text-sm mt-0.5">
            {data?.total ?? 0} organisation{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>

        <Button
          onClick={() => {
            setOrgSelectionnee(null);
            setModalOrg('creer');
          }}
          className="gap-2"
        >
          <Plus size={13} />
          Nouvelle organisation
        </Button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <PartenairesFiltres
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        type={type}
        onTypeChange={(v) => {
          setType(v);
          setPage(1);
        }}
        pays={pays}
        onPaysChange={(v) => {
          setPays(v);
          setPage(1);
        }}
        paysDisponibles={paysDisponibles}
        region={region}
        onRegionChange={(v) => {
          setRegion(v);
          setPage(1);
        }}
        regionsDisponibles={regionsDisponibles}
        onReset={() => {
          setSearch('');
          setType('tous');
          setPays('');
          setRegion('');
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
        sorting={sorting}
        onSortingChange={(updater) => {
          setSorting(updater);
          setPage(1);
        }}
      />

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <PartenairesPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageLabel={t('common.page')}
        ofLabel={t('common.of')}
      />

      {/* ── Dialog : Organisation ─────────────────────────────────────── */}
      <OrganisationDialog
        mode={modalOrg}
        organisation={orgSelectionnee}
        onOpenChange={(open) => {
          if (!open) {
            setModalOrg(null);
            setOrgSelectionnee(null);
          }
        }}
        onSubmit={(data) => {
          if (modalOrg === 'creer') {
            creerOrgMutation.mutate(data);
          } else if (orgSelectionnee) {
            modifierOrgMutation.mutate({ id: orgSelectionnee.id, data });
          }
        }}
        chargement={creerOrgMutation.isPending || modifierOrgMutation.isPending}
      />

      {/* ── Dialog : Contacts ─────────────────────────────────────────── */}
      <ContactsDialog
        organisation={voirContacts}
        contacts={contactsOrg}
        modeAjout={modalContact}
        onOpenChange={(open) => {
          if (!open) {
            setVoirContacts(null);
            setModalContact(false);
          }
        }}
        onDemarrerAjout={() => setModalContact(true)}
        onAnnulerAjout={() => setModalContact(false)}
        onSubmitContact={(data) => creerContactMutation.mutate(data)}
        onDefinirPrincipal={(contactId) => definirPrincipalMutation.mutate(contactId)}
        chargementAjout={creerContactMutation.isPending}
      />
    </div>
  );
}
