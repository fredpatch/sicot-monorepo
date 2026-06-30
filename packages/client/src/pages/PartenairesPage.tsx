import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Mail, Phone, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { organisationsApi } from '@/lib/organisations.api';
import { useNavigate } from 'react-router-dom';

// ── Types ──────────────────────────────────────────────────────────────────
interface Contact {
  id: number;
  organisationId: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  principal: boolean;
  actif: boolean;
}

interface Organisation {
  id: number;
  nom: string;
  pays: string;
  region?: string;
  type: string;
  actif: boolean;
  notes?: string;
  contacts?: Contact[];
  createdAt: string;
}

type OrganisationType = 'tous' | 'anac_etrangere' | 'organisation_internationale' | 'autre';

const TYPES_FILTER: { value: OrganisationType; label: string }[] = [
  { value: 'tous', label: 'Tous les types' },
  { value: 'anac_etrangere', label: 'ANAC étrangère' },
  { value: 'organisation_internationale', label: 'Organisation internationale' },
  { value: 'autre', label: 'Autre' },
];

const TYPES_FORM = [
  { value: 'anac_etrangere', label: 'ANAC étrangère' },
  { value: 'organisation_internationale', label: 'Organisation internationale' },
  { value: 'autre', label: 'Autre' },
];

// ── Schemas ────────────────────────────────────────────────────────────────
const orgSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  pays: z.string().min(1, 'Le pays est requis'),
  region: z.string().optional(),
  type: z.string().min(1, 'Le type est requis'),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  poste: z.string().optional(),
  principal: z.boolean(),
});

type OrgFormData = z.infer<typeof orgSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

// ── Badge type organisation ────────────────────────────────────────────────
function BadgeType({ type }: { type: string }) {
  const config: Record<string, { label: string; classe: string }> = {
    anac_etrangere: { label: 'ANAC étrangère', classe: 'badge-info' },
    organisation_internationale: { label: 'Org. internationale', classe: 'badge-warning' },
    autre: { label: 'Autre', classe: 'badge-actif' },
  };
  const { label, classe } = config[type] ?? { label: type, classe: 'badge-info' };
  return <span className={classe}>{label}</span>;
}

// ── Formulaire Organisation (RHF) ──────────────────────────────────────────
interface FormulaireOrgProps {
  initial?: Partial<Organisation>;
  onSubmit: (data: OrgFormData) => void;
  onCancel: () => void;
  chargement: boolean;
}

function FormulaireOrganisation({ initial, onSubmit, onCancel, chargement }: FormulaireOrgProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      nom: initial?.nom ?? '',
      pays: initial?.pays ?? '',
      region: initial?.region ?? '',
      type: initial?.type ?? 'autre',
      notes: initial?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        {/* Nom */}
        <div className="space-y-1.5">
          <Label htmlFor="org-nom">Nom de l&apos;organisation *</Label>
          <Input
            id="org-nom"
            {...register('nom')}
            aria-invalid={!!errors.nom}
            className={errors.nom ? 'border-anac-danger' : ''}
          />
          {errors.nom && <p className="text-[11px] text-anac-danger">{errors.nom.message}</p>}
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="org-type">Type *</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="org-type" aria-invalid={!!errors.type}>
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_FORM.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-[11px] text-anac-danger">{errors.type.message}</p>}
        </div>

        {/* Pays */}
        <div className="space-y-1.5">
          <Label htmlFor="org-pays">Pays *</Label>
          <Input
            id="org-pays"
            {...register('pays')}
            aria-invalid={!!errors.pays}
            className={errors.pays ? 'border-anac-danger' : ''}
          />
          {errors.pays && <p className="text-[11px] text-anac-danger">{errors.pays.message}</p>}
        </div>

        {/* Région */}
        <div className="space-y-1.5">
          <Label htmlFor="org-region">Région</Label>
          <Input id="org-region" {...register('region')} placeholder="Ex: Afrique Centrale" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="org-notes">Notes</Label>
        <textarea
          id="org-notes"
          {...register('notes')}
          rows={3}
          className="input resize-none"
          placeholder="Informations complémentaires..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={chargement} className="gap-2">
          {chargement ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Formulaire Contact (RHF) ───────────────────────────────────────────────
interface FormulaireContactProps {
  organisationId: number;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  chargement: boolean;
}

function FormulaireContact({ onSubmit, onCancel, chargement }: FormulaireContactProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      poste: '',
      principal: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-nom">Nom *</Label>
          <Input
            id="c-nom"
            {...register('nom')}
            aria-invalid={!!errors.nom}
            className={errors.nom ? 'border-anac-danger' : ''}
          />
          {errors.nom && <p className="text-[11px] text-anac-danger">{errors.nom.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-prenom">Prénom *</Label>
          <Input
            id="c-prenom"
            {...register('prenom')}
            aria-invalid={!!errors.prenom}
            className={errors.prenom ? 'border-anac-danger' : ''}
          />
          {errors.prenom && <p className="text-[11px] text-anac-danger">{errors.prenom.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            inputMode="email"
            {...register('email')}
            aria-invalid={!!errors.email}
            className={errors.email ? 'border-anac-danger' : ''}
          />
          {errors.email && <p className="text-[11px] text-anac-danger">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-tel">Téléphone</Label>
          <Input id="c-tel" type="tel" {...register('telephone')} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="c-poste">Poste / Fonction</Label>
          <Input
            id="c-poste"
            {...register('poste')}
            placeholder="Ex: Directeur de la Sécurité Aérienne"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="c-principal"
          {...register('principal')}
          className="rounded border-anac-border"
        />
        <label htmlFor="c-principal" className="text-sm text-anac-text cursor-pointer">
          Contact principal de l&apos;organisation
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={chargement} className="gap-2">
          {chargement ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Ajouter le contact'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function PartenairesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── Filtres ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [pays, setPays] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState<OrganisationType>('tous');
  const [page, setPage] = useState(1);

  // ── État modals ───────────────────────────────────────────────────────
  const [modalOrg, setModalOrg] = useState<'creer' | 'modifier' | null>(null);
  const [orgSelectionnee, setOrgSelectionnee] = useState<Organisation | null>(null);
  const [modalContact, setModalContact] = useState(false);
  const [voirContacts, setVoirContacts] = useState<Organisation | null>(null);

  // ── Requêtes ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['organisations', search, pays, region, type, page],
    queryFn: async () => {
      const response = await organisationsApi.lister({
        search: search || undefined,
        pays: pays || undefined,
        region: region || undefined,
        type: type !== 'tous' ? type : undefined,
        page,
        pageSize: 20,
      });
      return response.data as { data: Organisation[]; total: number };
    },
  });

  const { data: paysDisponibles } = useQuery({
    queryKey: ['organisations-pays'],
    queryFn: async () => {
      const response = await organisationsApi.getPays();
      return response.data as string[];
    },
  });

  const { data: regionsDisponibles } = useQuery({
    queryKey: ['organisations-regions'],
    queryFn: async () => {
      const response = await organisationsApi.getRegions();
      return response.data as string[];
    },
  });

  const { data: contactsOrg } = useQuery({
    queryKey: ['contacts', voirContacts?.id],
    queryFn: async () => {
      if (!voirContacts) return [];
      const response = await organisationsApi.listerContacts(voirContacts.id);
      return response.data as Contact[];
    },
    enabled: !!voirContacts,
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const creerOrgMutation = useMutation({
    mutationFn: (data: OrgFormData) =>
      organisationsApi.creer({
        nom: data.nom,
        pays: data.pays,
        region: data.region,
        type: data.type,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      setModalOrg(null);
    },
  });

  const modifierOrgMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrgFormData }) =>
      organisationsApi.mettreAJour(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      setModalOrg(null);
      setOrgSelectionnee(null);
    },
  });

  const creerContactMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      organisationsApi.creerContact(voirContacts!.id, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || undefined,
        telephone: data.telephone,
        poste: data.poste,
        principal: data.principal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', voirContacts?.id] });
      setModalContact(false);
    },
  });

  const definirPrincipalMutation = useMutation({
    mutationFn: (contactId: number) => organisationsApi.definirContactPrincipal(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', voirContacts?.id] });
    },
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

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
      <div className="card p-4 flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder={t('common.search') + '...'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-52"
        />

        {/* Filtre type */}
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as OrganisationType);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES_FILTER.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre pays */}
        <Select
          value={pays || '__all__'}
          onValueChange={(v) => {
            setPays(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les pays</SelectItem>
            {paysDisponibles?.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre région */}
        <Select
          value={region || '__all__'}
          onValueChange={(v) => {
            setRegion(v === '__all__' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les régions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les régions</SelectItem>
            {regionsDisponibles?.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || type !== 'tous' || pays || region) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearch('');
              setType('tous');
              setPays('');
              setRegion('');
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-4 py-3">Organisation</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Pays</th>
              <th className="text-left px-4 py-3">Région</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-anac-muted">
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                  {t('common.loading')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-anac-muted">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              data?.data.map((org) => (
                <tr key={org.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="font-medium text-anac-navy">{org.nom}</div>
                    {org.notes && (
                      <div className="text-anac-muted text-xs truncate max-w-xs">{org.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeType type={org.type} />
                  </td>
                  <td className="px-4 py-3 text-anac-text">{org.pays}</td>
                  <td className="px-4 py-3 text-anac-muted">{org.region ?? '—'}</td>
                  <td className="px-4 py-3">
                    {org.actif ? (
                      <span className="badge-actif">{t('common.active')}</span>
                    ) : (
                      <span className="badge-expire">{t('common.inactive')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setOrgSelectionnee(org);
                          setModalOrg('modifier');
                        }}
                        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                      >
                        {t('common.edit')}
                      </Button>
                      <span className="text-anac-border">·</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setVoirContacts(org)}
                        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                      >
                        Contacts
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate(`/accords?partenaireId=${org.id}`)}
                        className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                      >
                        Accords
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-anac-muted">
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft size={13} /> Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1.5"
            >
              Suivant <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog : Organisation ─────────────────────────────────────── */}
      <Dialog
        open={!!modalOrg}
        onOpenChange={(open) => {
          if (!open) {
            setModalOrg(null);
            setOrgSelectionnee(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {modalOrg === 'creer'
                ? 'Nouvelle organisation'
                : `Modifier — ${orgSelectionnee?.nom}`}
            </DialogTitle>
            <DialogDescription>
              {modalOrg === 'creer'
                ? 'Renseignez les informations du nouveau partenaire.'
                : 'Modifiez les informations de cette organisation.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FormulaireOrganisation
              key={orgSelectionnee?.id ?? 'new'}
              initial={orgSelectionnee ?? undefined}
              onSubmit={(data) => {
                if (modalOrg === 'creer') {
                  creerOrgMutation.mutate(data);
                } else if (orgSelectionnee) {
                  modifierOrgMutation.mutate({ id: orgSelectionnee.id, data });
                }
              }}
              onCancel={() => {
                setModalOrg(null);
                setOrgSelectionnee(null);
              }}
              chargement={creerOrgMutation.isPending || modifierOrgMutation.isPending}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Contacts ─────────────────────────────────────────── */}
      <Dialog
        open={!!voirContacts}
        onOpenChange={(open) => {
          if (!open) {
            setVoirContacts(null);
            setModalContact(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contacts — {voirContacts?.nom}</DialogTitle>
            <DialogDescription>
              {voirContacts?.pays}
              {voirContacts?.region ? ` · ${voirContacts.region}` : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="max-h-[60vh] overflow-y-auto space-y-4">
            {!modalContact ? (
              <>
                {contactsOrg?.length === 0 ? (
                  <p className="text-anac-muted text-sm text-center py-8">
                    Aucun contact enregistré.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contactsOrg?.map((contact) => (
                      <div
                        key={contact.id}
                        className="border border-anac-border rounded-lg p-4 flex items-start justify-between hover:bg-anac-gray/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-anac-navy">
                              {contact.prenom} {contact.nom}
                            </span>
                            {contact.principal && (
                              <span className="badge-info text-xs">Principal</span>
                            )}
                            {!contact.actif && (
                              <span className="badge-expire text-xs">Inactif</span>
                            )}
                          </div>
                          {contact.poste && (
                            <p className="text-anac-muted text-xs">{contact.poste}</p>
                          )}
                          <div className="flex gap-4 mt-1.5 text-xs text-anac-muted">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center gap-1 hover:text-anac-navy transition-colors"
                              >
                                <Mail size={11} /> {contact.email}
                              </a>
                            )}
                            {contact.telephone && (
                              <span className="flex items-center gap-1">
                                <Phone size={11} /> {contact.telephone}
                              </span>
                            )}
                          </div>
                        </div>
                        {!contact.principal && contact.actif && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => definirPrincipalMutation.mutate(contact.id)}
                            className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy flex-shrink-0 ml-4"
                          >
                            Définir principal
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => setModalContact(true)}
                >
                  <Plus size={13} /> Ajouter un contact
                </Button>
              </>
            ) : (
              <div>
                <p className="font-medium text-anac-navy text-sm mb-4">Nouveau contact</p>
                <FormulaireContact
                  organisationId={voirContacts!.id}
                  onSubmit={(data) => creerContactMutation.mutate(data)}
                  onCancel={() => setModalContact(false)}
                  chargement={creerContactMutation.isPending}
                />
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
