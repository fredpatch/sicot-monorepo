import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { courriersApi } from '@/lib/courriers.api';
import { accordsApi } from '@/lib/accords.api';
import { organisationsApi } from '@/lib/organisations.api';
import { contactsApi, type ContactListItem } from '@/lib/contacts.api';
import { courrierEditSchema, type CourrierEditFormData } from '../../courrier.schemas';
import { COURRIER_STATUS_OPTIONS } from '../../courrier.constants';
import type { Courrier } from '../../courrier.types';
import { CourrierDirectionBadge } from '../CourrierDirectionBadge';
import { QuickCreateOrganisationDialog } from '../QuickCreateOrganisationDialog';
import { QuickCreateContactDialog } from '../QuickCreateContactDialog';

interface Accord {
  id: number;
  reference: string;
  titre: string;
}

interface Organisation {
  id: number;
  nom: string;
  pays: string;
}

// Grouped sections, not the create stepper. Direction stays immutable (a
// courrier doesn't flip from entrant to sortant); expéditeur/destinataire,
// date, and réponse requise are editable per explicit user request.
// Documents are managed from the detail workspace's Documents section
// (real add/remove endpoints), not here.
export default function CourrierEditForm() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const courrierId = id ? parseInt(id, 10) : undefined;

  const [interlocuteurPreview, setInterlocuteurPreview] = useState<Organisation | null>(null);
  const [quickCreateOrgOpen, setQuickCreateOrgOpen] = useState(false);
  const [quickCreateContactOpen, setQuickCreateContactOpen] = useState(false);

  const courrierQuery = useQuery({
    queryKey: ['courrier', courrierId],
    queryFn: async () => {
      const res = await courriersApi.getById(courrierId!);
      return res.data as Courrier;
    },
    enabled: Boolean(courrierId),
  });

  const { data: accordsData } = useQuery({
    queryKey: ['accords-actifs'],
    queryFn: async () => {
      const res = await accordsApi.lister({ statut: 'actif', pageSize: 100 });
      return res.data as { data: Accord[] };
    },
  });
  const accords = accordsData?.data ?? [];

  const { data: orgsData } = useQuery({
    queryKey: ['organisations-liste'],
    queryFn: async () => {
      const res = await organisationsApi.lister({ actif: true, pageSize: 200 });
      return res.data as { data: Organisation[] };
    },
  });
  const organisations = orgsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CourrierEditFormData>({
    resolver: zodResolver(courrierEditSchema),
    defaultValues: { objet: '', dateReception: '', reponseRequise: 'non' },
  });

  useEffect(() => {
    if (!courrierQuery.data) return;
    const courrier = courrierQuery.data;
    reset({
      objet: courrier.objet,
      dateReception: courrier.dateReception?.split('T')[0] ?? '',
      reponseRequise: courrier.reponseRequise,
      expediteurOrganisationId: courrier.expediteur?.id,
      destinataireOrganisationId: courrier.destinataire?.id,
      expediteurContactId: courrier.expediteurContact?.id,
      destinataireContactId: courrier.destinataireContact?.id,
      suiviStatut: courrier.suiviStatut,
      dateLimiteReponse: courrier.dateLimiteReponse?.split('T')[0] ?? '',
      accordId: courrier.accordId,
    });
    const interlocuteur =
      courrier.direction === 'entrant' ? courrier.expediteur : courrier.destinataire;
    setInterlocuteurPreview(interlocuteur ?? null);
  }, [courrierQuery.data, reset]);

  const direction = courrierQuery.data?.direction;
  const interlocuteurLabel = direction === 'entrant' ? 'Expéditeur' : 'Destinataire';
  const orgFieldName =
    direction === 'entrant' ? 'expediteurOrganisationId' : 'destinataireOrganisationId';
  const contactFieldName =
    direction === 'entrant' ? 'expediteurContactId' : 'destinataireContactId';

  const values = watch();
  const organisationSelectionneeId = values[orgFieldName];

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-organisation', organisationSelectionneeId],
    queryFn: async () => {
      const res = await contactsApi.lister({
        organisationId: organisationSelectionneeId,
        actif: true,
      });
      return res.data as { data: ContactListItem[] };
    },
    enabled: Boolean(organisationSelectionneeId),
  });
  const contactsDisponibles = contactsData?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (data: CourrierEditFormData) =>
      courriersApi.mettreAJour(courrierId!, {
        objet: data.objet,
        dateReception: data.dateReception,
        reponseRequise: data.reponseRequise,
        expediteurOrganisationId: data.expediteurOrganisationId,
        destinataireOrganisationId: data.destinataireOrganisationId,
        expediteurContactId:
          data.expediteurContactId ?? (direction === 'entrant' ? null : undefined),
        destinataireContactId:
          data.destinataireContactId ?? (direction === 'sortant' ? null : undefined),
        suiviStatut: data.suiviStatut,
        dateLimiteReponse: data.dateLimiteReponse || undefined,
        accordId: data.accordId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courriers'] });
      queryClient.invalidateQueries({ queryKey: ['courriers-aggregates'] });
      queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      navigate(`/courriers/${courrierId}`);
    },
  });

  async function cancel() {
    if (!isDirty || (await confirm({ title: 'Quitter sans enregistrer les modifications ?' }))) {
      navigate(courrierId ? `/courriers/${courrierId}` : '/courriers');
    }
  }

  if (courrierQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-anac-muted">
        <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (courrierQuery.isError || !courrierQuery.data) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Impossible de charger ce courrier.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/courriers')}
          className="mt-4"
        >
          Retour aux courriers
        </Button>
      </div>
    );
  }

  const courrier = courrierQuery.data;

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={cancel}
            aria-label="Retour au courrier"
          >
            <ArrowLeft size={15} aria-hidden="true" />
          </Button>
          <div>
            <p className="text-xs text-anac-muted">Courriers / {courrier.reference} / Modifier</p>
            <h2 className="mt-2 text-2xl font-bold text-anac-navy">Modifier le courrier</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={cancel}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit((data) => saveMutation.mutate(data))}
            disabled={saveMutation.isPending}
            className="gap-2 bg-anac-blue"
          >
            {saveMutation.isPending && (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            )}
            Enregistrer
          </Button>
        </div>
      </header>

      {saveMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-anac-danger">
          {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Une erreur est survenue.'}
        </div>
      )}

      <form
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        noValidate
        className="space-y-4"
      >
        <Section title="Informations">
          <div className="mb-4 flex items-center gap-2 text-sm text-anac-muted">
            <CourrierDirectionBadge direction={courrier.direction} />
            <span className="font-mono text-xs">{courrier.reference}</span>
            <span className="text-xs">
              - la direction n&apos;est pas modifiable après création.
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="objet">Objet *</Label>
              <Input
                id="objet"
                {...register('objet')}
                aria-invalid={Boolean(errors.objet)}
                className="mt-1"
              />
              {errors.objet && (
                <p className="mt-1 text-xs text-anac-danger">{errors.objet.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="dateReception">
                {courrier.direction === 'entrant' ? 'Date de réception *' : "Date d'envoi *"}
              </Label>
              <Input
                id="dateReception"
                type="date"
                {...register('dateReception')}
                className="mt-1"
              />
              {errors.dateReception && (
                <p className="mt-1 text-xs text-anac-danger">{errors.dateReception.message}</p>
              )}
            </div>
            <div>
              <Label>Réponse requise *</Label>
              <Controller
                name="reponseRequise"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                      <SelectItem value="pour_information">Pour information</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Controller
                name="suiviStatut"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COURRIER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {values.reponseRequise === 'oui' && (
              <div>
                <Label htmlFor="dateLimiteReponse">Date limite de réponse</Label>
                <Input
                  id="dateLimiteReponse"
                  type="date"
                  {...register('dateLimiteReponse')}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </Section>

        <Section title={interlocuteurLabel}>
          <Controller
            name={orgFieldName}
            control={control}
            render={({ field }) => (
              <div>
                <Label>{interlocuteurLabel}</Label>
                <Select
                  value={field.value?.toString() ?? '__none__'}
                  onValueChange={(v) => {
                    const orgId = v === '__none__' ? undefined : parseInt(v);
                    field.onChange(orgId);
                    setInterlocuteurPreview(organisations.find((o) => o.id === orgId) ?? null);
                    setValue(contactFieldName, null);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">- Aucun -</SelectItem>
                    {organisations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.nom}
                        <span className="ml-1 text-xs text-anac-muted">· {org.pays}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setQuickCreateOrgOpen(true)}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
                >
                  <Plus size={12} aria-hidden="true" />
                  {interlocuteurLabel} introuvable ? Créer une nouvelle organisation
                </button>
              </div>
            )}
          />

          {organisationSelectionneeId && (
            <Controller
              name={contactFieldName}
              control={control}
              render={({ field }) => (
                <div className="mt-4">
                  <Label>
                    Contact <span className="font-normal text-anac-muted">(optionnel)</span>
                  </Label>
                  <Select
                    value={field.value?.toString() ?? '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="- Aucun contact spécifique -" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">- Aucun contact spécifique -</SelectItem>
                      {contactsDisponibles.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.prenom} {contact.nom}
                          {contact.poste ? (
                            <span className="ml-1 text-xs text-anac-muted">· {contact.poste}</span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setQuickCreateContactOpen(true)}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
                  >
                    <Plus size={12} aria-hidden="true" />
                    Contact introuvable ? En créer un nouveau
                  </button>
                </div>
              )}
            />
          )}
        </Section>

        <Section title="Rattachement">
          <Label>
            Accord lié <span className="font-normal text-anac-muted">(optionnel)</span>
          </Label>
          <Controller
            name="accordId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value?.toString() ?? '__none__'}
                onValueChange={(v) => field.onChange(v === '__none__' ? undefined : parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="- Aucun accord -" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">- Aucun accord -</SelectItem>
                  {accords.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      <span className="font-mono text-xs">{a.reference}</span>
                      <span className="ml-2 truncate text-xs text-anac-muted">{a.titre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Section>
      </form>

      <QuickCreateOrganisationDialog
        open={quickCreateOrgOpen}
        onOpenChange={setQuickCreateOrgOpen}
        onCreated={(org) => {
          setValue(orgFieldName, org.id, { shouldDirty: true });
          setInterlocuteurPreview(org);
        }}
      />

      {interlocuteurPreview && (
        <QuickCreateContactDialog
          open={quickCreateContactOpen}
          onOpenChange={setQuickCreateContactOpen}
          organisation={interlocuteurPreview}
          onCreated={(contact) => {
            setValue(contactFieldName, contact.id, { shouldDirty: true });
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold text-anac-navy">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
