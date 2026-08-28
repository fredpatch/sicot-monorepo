import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Info,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/App';
import { accordsApi } from '@/lib/accords.api';
import { organisationsApi } from '@/lib/organisations.api';
import type { Accord } from '@/pages/accords/accord.types';
import { AccordExpiryBadge } from '@/pages/accords/components/AccordExpiryBadge';
import { AccordStatusBadge } from '@/pages/accords/components/AccordStatusBadge';
import { canManagePartenaires } from '../partenaires.permissions';
import type { Contact, Organisation } from '../partenaires.types';
import {
  formatContactName,
  formatPartnerDate,
  getContactHealth,
  getOrganisationTypeLabel,
  getPrincipalContact,
} from '../partenaires.utils';
import { CountryMark } from './CountryMark';
import { OrganisationStatusBadge } from './OrganisationStatusBadge';
import { OrganisationTypeBadge } from './OrganisationTypeBadge';

type Section = 'overview' | 'contacts' | 'information' | 'accords' | 'system';

export default function PartenaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const organisationId = id ? parseInt(id, 10) : NaN;
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManagePartenaires(user?.role);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<Section>((searchParams.get('section') as Section) || 'overview');
  const [contactDialog, setContactDialog] = useState<{ mode: 'create' | 'edit'; contact?: Contact } | null>(null);

  const organisationQuery = useQuery({
    queryKey: ['organisation', organisationId],
    queryFn: async () => {
      const response = await organisationsApi.getById(organisationId);
      return response.data as Organisation;
    },
    enabled: Number.isFinite(organisationId),
  });

  const contactsQuery = useQuery({
    queryKey: ['contacts', organisationId],
    queryFn: async () => {
      const response = await organisationsApi.listerContacts(organisationId);
      return response.data as Contact[];
    },
    enabled: Number.isFinite(organisationId),
  });

  const accordsQuery = useQuery({
    queryKey: ['accords-partenaire-preview', organisationId],
    queryFn: async () => {
      const response = await accordsApi.lister({ partenairesId: organisationId, page: 1, pageSize: 5 });
      return response.data as { data: Accord[]; total: number };
    },
    enabled: Number.isFinite(organisationId),
  });

  useEffect(() => {
    const nextSection = searchParams.get('section') as Section | null;
    if (nextSection) setSection(nextSection);
  }, [searchParams]);

  function chooseSection(next: Section) {
    setSection(next);
    const params = new URLSearchParams(searchParams);
    params.set('section', next);
    setSearchParams(params, { replace: true });
  }

  const createContactMutation = useMutation({
    mutationFn: (data: ContactFormState) =>
      organisationsApi.creerContact(organisationId, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || undefined,
        telephone: data.telephone,
        poste: data.poste,
        principal: data.principal,
      }),
    onSuccess: () => {
      invalidatePartner(queryClient, organisationId);
      setContactDialog(null);
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: number; data: ContactFormState }) =>
      organisationsApi.mettreAJourContact(contactId, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || undefined,
        telephone: data.telephone,
        poste: data.poste,
        actif: data.actif,
      }),
    onSuccess: () => {
      invalidatePartner(queryClient, organisationId);
      setContactDialog(null);
    },
  });

  const principalMutation = useMutation({
    mutationFn: (contactId: number) => organisationsApi.definirContactPrincipal(contactId),
    onSuccess: () => invalidatePartner(queryClient, organisationId),
  });

  if (!Number.isFinite(organisationId)) {
    return <MissingPartner onBack={() => navigate('/partenaires')} />;
  }

  if (organisationQuery.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-anac-muted">
        <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (organisationQuery.isError || !organisationQuery.data) {
    return <MissingPartner onBack={() => navigate('/partenaires')} />;
  }

  const organisation = organisationQuery.data;
  const contacts = contactsQuery.data ?? organisation.contacts ?? [];
  const principal = getPrincipalContact({ ...organisation, contacts });
  const health = getContactHealth({ ...organisation, contacts });
  const accords = accordsQuery.data?.data ?? [];

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
            <Link to="/partenaires" className="inline-flex items-center gap-1 text-anac-blue hover:text-anac-navy">
              <ArrowLeft size={13} aria-hidden="true" />
              Partenaires
            </Link>
            <span>/</span>
            <span>{organisation.nom}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-anac-navy">{organisation.nom}</h2>
            <OrganisationTypeBadge type={organisation.type} />
            <OrganisationStatusBadge actif={organisation.actif} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-anac-muted">
            <span className="inline-flex items-center gap-1.5">
              <CountryMark country={organisation.pays} />
              {organisation.pays}
            </span>
            {organisation.region && <span>- {organisation.region}</span>}
            <span>- Enregistré dans SICOT le {formatPartnerDate(organisation.createdAt)}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button type="button" variant="outline" onClick={() => navigate(`/partenaires/${organisation.id}/edit`)} className="gap-2">
              <Pencil size={14} aria-hidden="true" />
              Modifier
            </Button>
          )}
          {canManage && (
            <Button type="button" onClick={() => setContactDialog({ mode: 'create' })} className="gap-2 bg-anac-blue">
              <Plus size={14} aria-hidden="true" />
              Ajouter un contact
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => navigate(`/accords?partenaireId=${organisation.id}`)} className="gap-2">
            <FileText size={14} aria-hidden="true" />
            Voir les accords
          </Button>
        </div>
      </header>

      {health.key !== 'complet' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-anac-warning">
          {health.helper}. Vérifiez les contacts de cette organisation.
        </div>
      )}

      <SummaryStrip organisation={organisation} contacts={contacts} totalAccords={accordsQuery.data?.total} />

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav className="card h-fit p-3" aria-label="Sections du partenaire">
          {[
            { key: 'overview', label: 'Aperçu', icon: Info },
            { key: 'contacts', label: 'Contacts', icon: Users },
            { key: 'information', label: 'Informations', icon: ShieldCheck },
            { key: 'accords', label: 'Accords liés', icon: FileText },
            { key: 'system', label: 'Informations système', icon: CalendarDays },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseSection(key as Section)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                section === key ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted hover:bg-anac-gray'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <main>
          {section === 'overview' && (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <section className="card p-5">
                <h3 className="font-bold text-anac-navy">Informations clés</h3>
                <dl className="mt-4 grid gap-4 text-sm">
                  <DetailRow label="Nom complet" value={organisation.nom} />
                  <DetailRow label="Type" value={getOrganisationTypeLabel(organisation.type)} />
                  <DetailRow label="Pays" value={organisation.pays} />
                  <DetailRow label="Région" value={organisation.region || '-'} />
                  <DetailRow label="Statut" value={<OrganisationStatusBadge actif={organisation.actif} />} />
                  <DetailRow label="Notes" value={organisation.notes || 'Aucune note'} />
                  <DetailRow label="Date d'enregistrement" value={formatPartnerDate(organisation.createdAt, 'long')} />
                </dl>
              </section>

              <aside className="space-y-4">
                <ContactsPreview
                  contacts={contacts}
                  principal={principal}
                  canManage={canManage}
                  onAdd={() => setContactDialog({ mode: 'create' })}
                  onViewAll={() => chooseSection('contacts')}
                />
                <AgreementsPreview
                  accords={accords}
                  total={accordsQuery.data?.total ?? 0}
                  loading={accordsQuery.isLoading}
                  organisationId={organisation.id}
                />
              </aside>
            </div>
          )}

          {section === 'contacts' && (
            <ContactsSection
              contacts={contacts}
              isLoading={contactsQuery.isLoading}
              canManage={canManage}
              onAdd={() => setContactDialog({ mode: 'create' })}
              onEdit={(contact) => setContactDialog({ mode: 'edit', contact })}
              onPrincipal={(contactId) => principalMutation.mutate(contactId)}
              principalPending={principalMutation.isPending}
            />
          )}

          {section === 'information' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Informations</h3>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <DetailRow label="Nom" value={organisation.nom} />
                <DetailRow label="Type" value={getOrganisationTypeLabel(organisation.type)} />
                <DetailRow label="Pays" value={organisation.pays} />
                <DetailRow label="Région" value={organisation.region || '-'} />
                <DetailRow label="Statut" value={organisation.actif ? 'Actif' : 'Inactif'} />
                <DetailRow label="Notes" value={organisation.notes || 'Aucune note'} />
              </dl>
            </section>
          )}

          {section === 'accords' && (
            <section className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-anac-navy">Accords liés</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/accords?partenaireId=${organisation.id}`)}>
                  Voir tous les accords
                </Button>
              </div>
              <AgreementsList accords={accords} loading={accordsQuery.isLoading} />
            </section>
          )}

          {section === 'system' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Informations système</h3>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <DetailRow label="ID enregistrement" value={`#${organisation.id}`} />
                <DetailRow label="Créé le" value={formatPartnerDate(organisation.createdAt, 'long')} />
                <DetailRow label="Dernière modification" value={formatPartnerDate(organisation.updatedAt, 'long')} />
                <DetailRow label="État actif" value={organisation.actif ? 'Oui' : 'Non'} />
              </dl>
            </section>
          )}
        </main>
      </div>

      <ContactFormDialog
        state={contactDialog}
        onOpenChange={(open) => !open && setContactDialog(null)}
        onSubmit={(data) => {
          if (contactDialog?.mode === 'edit' && contactDialog.contact) {
            updateContactMutation.mutate({ contactId: contactDialog.contact.id, data });
          } else {
            createContactMutation.mutate(data);
          }
        }}
        loading={createContactMutation.isPending || updateContactMutation.isPending}
      />
    </div>
  );
}

function invalidatePartner(queryClient: ReturnType<typeof useQueryClient>, organisationId: number) {
  queryClient.invalidateQueries({ queryKey: ['contacts', organisationId] });
  queryClient.invalidateQueries({ queryKey: ['organisation', organisationId] });
  queryClient.invalidateQueries({ queryKey: ['organisations'] });
  queryClient.invalidateQueries({ queryKey: ['organisations-registry'] });
}

function MissingPartner({ onBack }: { onBack: () => void }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <p className="font-semibold text-anac-navy">Organisation introuvable.</p>
      <p className="mt-1 text-sm text-anac-muted">Le partenaire demandé n&apos;est pas disponible.</p>
      <Button type="button" variant="outline" onClick={onBack} className="mt-4">
        Retour aux partenaires
      </Button>
    </div>
  );
}

function SummaryStrip({
  organisation,
  contacts,
  totalAccords,
}: {
  organisation: Organisation;
  contacts: Contact[];
  totalAccords?: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 rounded-lg border border-anac-border bg-white p-4 md:grid-cols-5">
      <SummaryItem label="Type" value={getOrganisationTypeLabel(organisation.type)} />
      <SummaryItem
        label="Pays"
        value={
          <span className="inline-flex items-center gap-1.5">
            <CountryMark country={organisation.pays} />
            {organisation.pays}
          </span>
        }
      />
      <SummaryItem label="Contacts actifs" value={`${contacts.filter((contact) => contact.actif).length} / ${contacts.length}`} />
      <SummaryItem label="Accords liés" value={totalAccords ?? organisation.accordsCount ?? 0} />
      <SummaryItem label="Statut" value={<OrganisationStatusBadge actif={organisation.actif} />} />
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-r border-anac-border pr-3 last:border-r-0">
      <p className="text-xs text-anac-muted">{label}</p>
      <div className="mt-1 font-semibold text-anac-navy">{value}</div>
    </div>
  );
}

function ContactsPreview({
  contacts,
  principal,
  canManage,
  onAdd,
  onViewAll,
}: {
  contacts: Contact[];
  principal?: Contact;
  canManage: boolean;
  onAdd: () => void;
  onViewAll: () => void;
}) {
  const activeContacts = contacts.filter((contact) => contact.actif);
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-anac-navy">Contacts principaux</h3>
        {canManage && (
          <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
            Ajouter
          </Button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {principal ? <ContactCard contact={principal} compact /> : <p className="text-sm text-anac-muted">Aucun contact principal défini.</p>}
        {activeContacts
          .filter((contact) => contact.id !== principal?.id)
          .slice(0, 2)
          .map((contact) => (
            <ContactCard key={contact.id} contact={contact} compact />
          ))}
      </div>
      <Button type="button" variant="ghost" onClick={onViewAll} className="mt-3 w-full text-anac-blue">
        Voir tous les contacts ({contacts.length})
      </Button>
    </section>
  );
}

function AgreementsPreview({
  accords,
  total,
  loading,
  organisationId,
}: {
  accords: Accord[];
  total: number;
  loading: boolean;
  organisationId: number;
}) {
  return (
    <section className="card p-5">
      <h3 className="font-bold text-anac-navy">Relation accords</h3>
      <AgreementsList accords={accords.slice(0, 3)} loading={loading} />
      <Link to={`/accords?partenaireId=${organisationId}`} className="mt-3 block text-center text-sm font-semibold text-anac-blue">
        Voir tous les accords ({total})
      </Link>
    </section>
  );
}

function AgreementsList({ accords, loading }: { accords: Accord[]; loading: boolean }) {
  if (loading) return <p className="mt-4 text-sm text-anac-muted">Chargement...</p>;
  if (accords.length === 0) return <p className="mt-4 text-sm text-anac-muted">Aucun accord lié.</p>;
  return (
    <div className="mt-4 space-y-2">
      {accords.map((accord) => (
        <Link key={accord.id} to={`/accords/${accord.id}`} className="block rounded-md border border-anac-border px-4 py-3 hover:bg-anac-gray">
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="block font-semibold text-anac-navy">{accord.reference}</span>
              <span className="mt-1 block text-sm text-anac-muted">{accord.titre}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <AccordStatusBadge statut={accord.statut} />
              <AccordExpiryBadge accord={accord} showDate={false} />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function ContactsSection({
  contacts,
  isLoading,
  canManage,
  onAdd,
  onEdit,
  onPrincipal,
  principalPending,
}: {
  contacts: Contact[];
  isLoading: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (contact: Contact) => void;
  onPrincipal: (contactId: number) => void;
  principalPending: boolean;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-anac-navy">Contacts</h3>
        {canManage && (
          <Button type="button" onClick={onAdd} className="gap-2 bg-anac-blue">
            <Plus size={14} aria-hidden="true" />
            Ajouter un contact
          </Button>
        )}
      </div>
      {isLoading ? (
        <p className="mt-4 text-sm text-anac-muted">Chargement des contacts...</p>
      ) : contacts.length === 0 ? (
        <div className="mt-4 rounded-md border border-anac-border bg-anac-gray p-6 text-center">
          <p className="font-medium text-anac-navy">Aucun contact enregistré.</p>
          <p className="mt-1 text-sm text-anac-muted">Ajoutez un contact pour sécuriser le suivi opérationnel.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-md border border-anac-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-anac-gray text-xs font-semibold text-anac-navy">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Coordonnées</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-anac-border">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-anac-navy">{formatContactName(contact)}</div>
                    {contact.principal && <span className="mt-1 inline-flex badge-info">Principal</span>}
                  </td>
                  <td className="px-4 py-3 text-anac-muted">{contact.poste || '-'}</td>
                  <td className="px-4 py-3 text-xs text-anac-muted">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-anac-blue">
                        <Mail size={11} aria-hidden="true" />
                        {contact.email}
                      </a>
                    )}
                    {contact.telephone && (
                      <a href={`tel:${contact.telephone}`} className="mt-1 flex items-center gap-1 hover:text-anac-blue">
                        <Phone size={11} aria-hidden="true" />
                        {contact.telephone}
                      </a>
                    )}
                    {!contact.email && !contact.telephone && 'Aucune coordonnée'}
                  </td>
                  <td className="px-4 py-3">
                    {contact.actif ? <span className="badge-actif">Actif</span> : <span className="badge-expire">Inactif</span>}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(contact)}>
                          Modifier
                        </Button>
                        {!contact.principal && contact.actif && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onPrincipal(contact.id)}
                            disabled={principalPending}
                          >
                            Définir principal
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ContactCard({ contact, compact = false }: { contact: Contact; compact?: boolean }) {
  return (
    <div className="rounded-md border border-anac-border px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-anac-navy">{formatContactName(contact)}</p>
          {contact.poste && <p className="text-xs text-anac-muted">{contact.poste}</p>}
        </div>
        {contact.principal && <span className="badge-info">Principal</span>}
      </div>
      {!compact && <ContactCoordinates contact={contact} />}
      {compact && contact.email && <p className="mt-1 truncate text-xs text-anac-muted">{contact.email}</p>}
    </div>
  );
}

function ContactCoordinates({ contact }: { contact: Contact }) {
  return (
    <div className="mt-2 space-y-1 text-xs text-anac-muted">
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-anac-blue">
          <Mail size={11} aria-hidden="true" />
          {contact.email}
        </a>
      )}
      {contact.telephone && (
        <a href={`tel:${contact.telephone}`} className="flex items-center gap-1 hover:text-anac-blue">
          <Phone size={11} aria-hidden="true" />
          {contact.telephone}
        </a>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
      <dt className="text-xs font-medium text-anac-muted">{label}</dt>
      <dd className="text-anac-navy">{value}</dd>
    </div>
  );
}

interface ContactFormState {
  prenom: string;
  nom: string;
  poste?: string;
  email?: string;
  telephone?: string;
  principal: boolean;
  actif: boolean;
}

function ContactFormDialog({
  state,
  onOpenChange,
  onSubmit,
  loading,
}: {
  state: { mode: 'create' | 'edit'; contact?: Contact } | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContactFormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ContactFormState>({
    prenom: '',
    nom: '',
    poste: '',
    email: '',
    telephone: '',
    principal: false,
    actif: true,
  });

  useEffect(() => {
    setForm({
      prenom: state?.contact?.prenom ?? '',
      nom: state?.contact?.nom ?? '',
      poste: state?.contact?.poste ?? '',
      email: state?.contact?.email ?? '',
      telephone: state?.contact?.telephone ?? '',
      principal: state?.contact?.principal ?? false,
      actif: state?.contact?.actif ?? true,
    });
  }, [state]);

  const open = Boolean(state);
  const isEdit = state?.mode === 'edit';
  const valid = form.prenom.trim() && form.nom.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le contact' : 'Ajouter un contact'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            onSubmit(form);
          }}
        >
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom *" value={form.prenom} onChange={(value) => setForm({ ...form, prenom: value })} />
              <Field label="Nom *" value={form.nom} onChange={(value) => setForm({ ...form, nom: value })} />
              <Field label="Poste" value={form.poste ?? ''} onChange={(value) => setForm({ ...form, poste: value })} />
              <Field label="Email" type="email" value={form.email ?? ''} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Téléphone" type="tel" value={form.telephone ?? ''} onChange={(value) => setForm({ ...form, telephone: value })} />
            </div>
            {!isEdit && (
              <label className="flex items-center gap-2 text-sm text-anac-text">
                <input
                  type="checkbox"
                  checked={form.principal}
                  onChange={(event) => setForm({ ...form, principal: event.target.checked })}
                  className="size-4 rounded border-anac-border text-anac-blue focus:ring-anac-sky"
                />
                Contact principal de l&apos;organisation
              </label>
            )}
            {isEdit && (
              <label className="flex items-center gap-2 text-sm text-anac-text">
                <input
                  type="checkbox"
                  checked={form.actif}
                  onChange={(event) => setForm({ ...form, actif: event.target.checked })}
                  className="size-4 rounded border-anac-border text-anac-blue focus:ring-anac-sky"
                />
                Contact actif
              </label>
            )}
          </DialogBody>
          <DialogFooter className="bg-slate-50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !valid} className="gap-2 bg-anac-blue">
              {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
