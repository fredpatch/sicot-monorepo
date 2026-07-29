import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Info,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';

import HistoriqueNotifications from '@/pages/HistoriqueNotifications';
import ModalRelance from '@/components/ModalRelance';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { accordsApi } from '@/lib/accords.api';
import { documentsApi } from '@/lib/documents.api';
import { notificationsApi } from '@/lib/notifications.api';
import type { Accord } from '../accord.types';
import {
  formatAccordDate,
  formatExpiryLabel,
  getExpiryTone,
  isRenewable,
} from '../accord.utils';
import { AccordExpiryBadge } from './AccordExpiryBadge';
import { AccordStatusBadge } from './AccordStatusBadge';

interface AccordDetailProps {
  accordId: number;
  onModifier: () => void;
}

export default function AccordDetail({ accordId, onModifier }: AccordDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(searchParams.get('section') ?? 'overview');
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(searchParams.get('action') === 'renew');
  const [groupResult, setGroupResult] = useState<{
    envoyes: number;
    ignores: number;
    raisons: string[];
  } | null>(null);

  const accordQuery = useQuery({
    queryKey: ['accord', accordId],
    queryFn: async () => {
      const res = await accordsApi.getById(accordId);
      return res.data as Accord;
    },
  });

  const accord = accordQuery.data;

  const documentQuery = useQuery({
    queryKey: ['document', accord?.documentId],
    queryFn: async () => {
      const res = await documentsApi.getById(accord!.documentId!);
      return res.data as { id: number; nomOriginal: string; mimeType: string; createdAt?: string };
    },
    enabled: Boolean(accord?.documentId),
  });

  const parentQuery = useQuery({
    queryKey: ['accord', accord?.parentId],
    queryFn: async () => {
      const res = await accordsApi.getById(accord!.parentId!);
      return res.data as Accord;
    },
    enabled: Boolean(accord?.parentId),
  });

  const versionsQuery = useQuery({
    queryKey: ['accords-versions', accordId],
    queryFn: async () => {
      const res = await accordsApi.lister({ pageSize: 50 });
      const all = res.data as { data: Accord[] };
      return all.data.filter((item) => item.parentId === accordId);
    },
    enabled: Boolean(accord),
  });

  useEffect(() => {
    const nextSection = searchParams.get('section');
    if (nextSection) setSection(nextSection);
    setRenewOpen(searchParams.get('action') === 'renew');
  }, [searchParams]);

  function chooseSection(next: string) {
    setSection(next);
    const params = new URLSearchParams(searchParams);
    params.set('section', next);
    params.delete('action');
    setSearchParams(params, { replace: true });
  }

  function closeRenewal() {
    setRenewOpen(false);
    const params = new URLSearchParams(searchParams);
    params.delete('action');
    setSearchParams(params, { replace: true });
  }

  const recipients = useMemo(
    () =>
      (accord?.partenaires ?? [])
        .filter((partner) => partner.contactPrincipal?.email)
        .map((partner) => ({
          label: `${partner.contactPrincipal!.prenom} ${partner.contactPrincipal!.nom} - ${partner.nom}`,
          email: partner.contactPrincipal!.email!,
          nom: `${partner.contactPrincipal!.prenom} ${partner.contactPrincipal!.nom}`,
        })),
    [accord?.partenaires]
  );

  const notifyAllMutation = useMutation({
    mutationFn: async () => {
      if (!accord) throw new Error('Accord indisponible.');
      const withEmail = accord.partenaires.filter((partner) => partner.contactPrincipal?.email);
      const withoutEmail = accord.partenaires.filter((partner) => !partner.contactPrincipal?.email);
      let sent = 0;
      const failed: string[] = [];

      for (const partner of withEmail) {
        try {
          await notificationsApi.envoyer({
            type: 'accord_echeance',
            entiteId: accord.id,
            destinataireEmail: partner.contactPrincipal!.email!,
            destinataireNom: `${partner.contactPrincipal!.prenom} ${partner.contactPrincipal!.nom}`,
            objet: `Rappel - Accord ${accord.reference} (${accord.titre})`,
            message:
              `L'accord "${accord.titre}" (réf. ${accord.reference}) ` +
              (accord.dateExpiration
                ? `arrive à échéance le ${formatAccordDate(accord.dateExpiration, 'long')}.`
                : `nécessite votre attention.`) +
              `\n\nMerci de bien vouloir vous positionner sur la suite à donner.`,
          });
          sent++;
        } catch {
          failed.push(`${partner.nom} (échec envoi)`);
        }
      }

      return {
        envoyes: sent,
        ignores: failed.length + withoutEmail.length,
        raisons: [
          ...failed,
          ...withoutEmail.map((partner) => `${partner.nom} (pas de contact email)`),
        ],
      };
    },
    onSuccess: (result) => {
      setGroupResult(result);
      queryClient.invalidateQueries({ queryKey: ['notifications-historique', 'accord_echeance', accordId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (accordQuery.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-anac-muted">
        <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (accordQuery.isError || !accord) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Accord introuvable.</p>
        <p className="mt-1 text-sm text-anac-muted">L&apos;accord demandé n&apos;est pas disponible.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/accords')} className="mt-4">
          Retour aux accords
        </Button>
      </div>
    );
  }

  const expiryTone = getExpiryTone(accord);

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-anac-muted">
            <Link to="/accords" className="inline-flex items-center gap-1 text-anac-blue hover:text-anac-navy">
              <ArrowLeft size={13} aria-hidden="true" />
              Accords
            </Link>
            <span>/</span>
            <span>{accord.reference}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-anac-navy">{accord.titre}</h2>
            <AccordStatusBadge statut={accord.statut} />
            {accord.parentId && (
              <span className="rounded border border-anac-border bg-anac-gray px-2 py-0.5 text-xs font-semibold text-anac-muted">
                Version renouvelée
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-anac-muted">{accord.reference} - {formatExpiryLabel(accord)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {documentQuery.data && (
            <a href={documentsApi.getUrlTelechargement(documentQuery.data.id)} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" className="gap-2">
                <Download size={14} aria-hidden="true" />
                Télécharger
              </Button>
            </a>
          )}
          <Button type="button" variant="outline" onClick={onModifier} className="gap-2">
            <Pencil size={14} aria-hidden="true" />
            Modifier
          </Button>
          {isRenewable(accord) && (
            <Button type="button" onClick={() => setRenewOpen(true)} className="gap-2 bg-anac-blue">
              <RefreshCw size={14} aria-hidden="true" />
              Renouveler l&apos;accord
            </Button>
          )}
        </div>
      </div>

      {expiryTone === 'critical' && (
        <OperationalBanner tone="critical">
          Cet accord a expiré le {formatAccordDate(accord.dateExpiration, 'long')}. Une décision est
          requise : renouveler, suspendre ou clôturer le suivi.
        </OperationalBanner>
      )}
      {expiryTone === 'warning' && (
        <OperationalBanner tone="warning">
          Cet accord expire dans {formatExpiryLabel(accord).replace('J-', '')} jours. Préparez le
          renouvellement ou contactez les partenaires.
        </OperationalBanner>
      )}

      <section className="grid grid-cols-2 gap-3 rounded-lg border border-anac-border bg-white p-4 md:grid-cols-4">
        <SummaryItem label="Référence" value={accord.reference} />
        <SummaryItem label="Statut" value={<AccordStatusBadge statut={accord.statut} />} />
        <SummaryItem label="Date de signature" value={formatAccordDate(accord.dateSignature)} />
        <SummaryItem
          label="Date d'expiration"
          value={
            accord.dateExpiration ? (
              <span className="inline-flex items-center gap-2">
                {formatAccordDate(accord.dateExpiration)}
                <AccordExpiryBadge accord={accord} showDate={false} />
              </span>
            ) : (
              'Sans date d’expiration'
            )
          }
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav className="card h-fit p-3" aria-label="Sections de l'accord">
          {[
            { key: 'overview', label: 'Aperçu', icon: Info },
            { key: 'partners', label: 'Partenaires', icon: Users },
            { key: 'document', label: 'Document', icon: FileText },
            { key: 'validity', label: 'Validité et versions', icon: History },
            { key: 'notifications', label: 'Notifications', icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseSection(key)}
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
                  <DetailRow label="Titre" value={accord.titre} />
                  <DetailRow label="Statut" value={<AccordStatusBadge statut={accord.statut} />} />
                  <DetailRow label="Signature" value={formatAccordDate(accord.dateSignature, 'long')} />
                  <DetailRow label="Échéance" value={accord.dateExpiration ? formatAccordDate(accord.dateExpiration, 'long') : 'Sans date d’expiration'} />
                  <DetailRow label="Notes" value={accord.notes || 'Aucune note'} />
                  {parentQuery.data && (
                    <DetailRow
                      label="Accord parent"
                      value={<Link to={`/accords/${parentQuery.data.id}`} className="text-anac-blue">{parentQuery.data.reference}</Link>}
                    />
                  )}
                </dl>
              </section>

              <aside className="space-y-4">
                <section className="card p-5">
                  <h3 className="font-bold text-anac-navy">Cycle de validité</h3>
                  <ol className="mt-4 text-sm">
                    <TimelineItem
                      label="Accord signé"
                      date={formatAccordDate(accord.dateSignature)}
                      first
                      last={!accord.dateExpiration && !versionsQuery.data?.length}
                    />
                    {accord.dateExpiration && <TimelineItem label="Début de surveillance à 90 jours" date="J-90" />}
                    {accord.dateExpiration && (
                      <TimelineItem
                        label="Échéance"
                        date={formatAccordDate(accord.dateExpiration)}
                        last={!versionsQuery.data?.length}
                      />
                    )}
                    {versionsQuery.data && versionsQuery.data.length > 0 && (
                      <TimelineItem
                        label="Renouvellement créé"
                        date={`${versionsQuery.data.length} version${versionsQuery.data.length > 1 ? 's' : ''}`}
                        last
                      />
                    )}
                  </ol>
                </section>
                <section className="card p-5">
                  <h3 className="font-bold text-anac-navy">Dossier lié</h3>
                  <div className="mt-4 space-y-3">
                    <DossierLink
                      icon={documentQuery.data ? FileText : FolderOpen}
                      label={documentQuery.data ? documentQuery.data.nomOriginal : 'Aucun document lié'}
                      helper="Document de référence"
                    />
                    <DossierLink
                      icon={Users}
                      label={`${accord.partenaires.length} partenaire${accord.partenaires.length > 1 ? 's' : ''}`}
                      helper="Organisations associées"
                    />
                    {parentQuery.data && (
                      <DossierLink icon={Link2} label={parentQuery.data.reference} helper="Accord parent" />
                    )}
                  </div>
                </section>
              </aside>
            </div>
          )}

          {section === 'partners' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Partenaires</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {accord.partenaires.map((partner) => (
                  <div key={partner.id} className="rounded-md border border-anac-border p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-anac-blue">
                        <Users size={17} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-anac-navy">{partner.nom}</p>
                        <p className="text-sm text-anac-muted">{partner.pays} - {partner.type}</p>
                        {partner.contactPrincipal ? (
                          <p className="mt-2 text-xs text-anac-muted">
                            {partner.contactPrincipal.prenom} {partner.contactPrincipal.nom}
                            {partner.contactPrincipal.email ? ` - ${partner.contactPrincipal.email}` : ' - sans email'}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-medium text-anac-warning">
                            Aucun contact principal défini.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === 'document' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Document</h3>
              {documentQuery.data ? (
                <div className="mt-4 flex items-center justify-between rounded-md border border-anac-border p-4">
                  <span className="flex items-center gap-3">
                    <FileText size={18} className="text-anac-blue" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-anac-navy">{documentQuery.data.nomOriginal}</span>
                      <span className="text-xs text-anac-muted">{documentQuery.data.mimeType}</span>
                    </span>
                  </span>
                  <a href={documentsApi.getUrlTelechargement(documentQuery.data.id)} target="_blank" rel="noopener noreferrer" className="text-anac-blue">
                    <ExternalLink size={16} aria-label="Ouvrir le document" />
                  </a>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-anac-border bg-anac-gray p-6 text-center">
                  <p className="font-medium text-anac-navy">Aucun document de référence n&apos;est lié à cet accord.</p>
                  <Button type="button" variant="outline" onClick={onModifier} className="mt-4">
                    Modifier l&apos;accord pour lier un document
                  </Button>
                </div>
              )}
            </section>
          )}

          {section === 'validity' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Validité et versions</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoBox icon={<CalendarDays size={17} />} label="Signature" value={formatAccordDate(accord.dateSignature)} />
                <InfoBox icon={<AlertCircle size={17} />} label="Échéance" value={accord.dateExpiration ? formatAccordDate(accord.dateExpiration) : 'Sans échéance'} />
                <InfoBox icon={<RefreshCw size={17} />} label="État" value={formatExpiryLabel(accord)} />
              </div>
              {parentQuery.data && (
                <Link to={`/accords/${parentQuery.data.id}`} className="mt-4 block rounded-md border border-anac-border p-4 hover:bg-anac-gray">
                  Accord parent : {parentQuery.data.reference}
                </Link>
              )}
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-anac-navy">Renouvellements</p>
                {versionsQuery.data?.length ? (
                  versionsQuery.data.map((version) => (
                    <Link key={version.id} to={`/accords/${version.id}`} className="block rounded-md border border-anac-border px-4 py-3 hover:bg-anac-gray">
                      {version.reference} - {formatAccordDate(version.dateSignature)}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-anac-muted">Aucune version renouvelée trouvée.</p>
                )}
              </div>
            </section>
          )}

          {section === 'notifications' && (
            <section className="space-y-4">
              <div className="card p-5">
                <h3 className="font-bold text-anac-navy">Notifications</h3>
                <p className="mt-1 text-sm text-anac-muted">
                  {recipients.length} partenaire{recipients.length > 1 ? 's' : ''} avec email disponible.
                  {accord.partenaires.length - recipients.length > 0 &&
                    ` ${accord.partenaires.length - recipients.length} partenaire(s) seront ignorés faute d'email.`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setRelanceOpen(true)} className="gap-2">
                    <Send size={14} aria-hidden="true" />
                    Préparer une relance
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setGroupResult(null);
                      notifyAllMutation.mutate();
                    }}
                    disabled={recipients.length === 0 || notifyAllMutation.isPending}
                    className="gap-2 bg-anac-blue"
                  >
                    {notifyAllMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Notifier les partenaires
                  </Button>
                </div>
                {groupResult && (
                  <div className="mt-4 rounded-md border border-anac-border bg-anac-gray px-4 py-3 text-sm">
                    <p className="font-semibold text-anac-navy">
                      {groupResult.envoyes} notification(s) envoyée(s), {groupResult.ignores} ignorée(s).
                    </p>
                    {groupResult.raisons.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-anac-muted">
                        {groupResult.raisons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <HistoriqueNotifications type="accord_echeance" entiteId={accordId} />
            </section>
          )}
        </main>
      </div>

      <RenewalDialog accord={accord} open={renewOpen} onOpenChange={(open) => (open ? setRenewOpen(true) : closeRenewal())} />

      <ModalRelance
        open={relanceOpen}
        onClose={() => setRelanceOpen(false)}
        type="accord_echeance"
        entiteId={accord.id}
        objetParDefaut={`Rappel - Accord ${accord.reference} (${accord.titre})`}
        messageParDefaut={
          `L'accord "${accord.titre}" (réf. ${accord.reference}) ` +
          (accord.dateExpiration
            ? `arrive à échéance le ${formatAccordDate(accord.dateExpiration, 'long')}.`
            : `nécessite votre attention.`) +
          `\n\nMerci de bien vouloir vous positionner sur la suite à donner.`
        }
        destinatairesSuggeres={recipients}
      />
    </div>
  );
}

function RenewalDialog({
  accord,
  open,
  onOpenChange,
}: {
  accord: Accord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateSignature, setDateSignature] = useState('');
  const [dateExpiration, setDateExpiration] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const renewalMutation = useMutation({
    mutationFn: () =>
      accordsApi.renouveler(accord.id, {
        dateSignature,
        dateExpiration: dateExpiration || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accords'] });
      queryClient.invalidateQueries({ queryKey: ['accord', accord.id] });
      const renewed = res.data.accord as Accord;
      onOpenChange(false);
      navigate(`/accords/${renewed.id}`);
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Le renouvellement a échoué.'
      );
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!dateSignature) {
      setError('La date de signature est requise.');
      return;
    }
    if (dateExpiration && new Date(dateExpiration) <= new Date(dateSignature)) {
      setError("La date d'expiration doit être postérieure à la signature.");
      return;
    }
    renewalMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogHeader className="pr-12">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-anac-blue">
              <RefreshCw size={18} aria-hidden="true" />
            </span>
            <span>
              <DialogTitle className="text-base">Renouveler l&apos;accord</DialogTitle>
              <DialogDescription>
                Créez une nouvelle version sans perdre l&apos;historique de suivi.
              </DialogDescription>
            </span>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody className="space-y-5">
            <div className="grid gap-3 rounded-lg border border-anac-border bg-anac-gray p-4 text-sm sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold text-anac-navy">{accord.reference}</p>
                <p className="mt-1 text-anac-muted">{accord.titre}</p>
              </div>
              <div className="flex items-start sm:justify-end">
                <AccordStatusBadge statut={accord.statut} />
              </div>
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-anac-muted">
              L&apos;accord actuel passera au statut « En renouvellement » et restera disponible dans
              l&apos;historique des versions.
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-anac-danger">
                {error}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="renew-signature">Nouvelle date de signature *</Label>
                <Input
                  id="renew-signature"
                  type="date"
                  value={dateSignature}
                  onChange={(event) => setDateSignature(event.target.value)}
                  aria-invalid={Boolean(error && !dateSignature)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="renew-expiration">Nouvelle date d&apos;expiration</Label>
                <Input
                  id="renew-expiration"
                  type="date"
                  value={dateExpiration}
                  onChange={(event) => setDateExpiration(event.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="renew-notes">Notes de renouvellement</Label>
              <textarea
                id="renew-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="input mt-1 min-h-28 resize-none"
                placeholder="Décision, contexte, référence du courrier ou prochaine étape..."
              />
            </div>
          </DialogBody>
          <DialogFooter className="bg-slate-50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={renewalMutation.isPending} className="gap-2 bg-anac-blue">
              {renewalMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Confirmer le renouvellement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OperationalBanner({ tone, children }: { tone: 'critical' | 'warning'; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${
        tone === 'critical'
          ? 'border-red-200 bg-red-50 text-anac-danger'
          : 'border-amber-200 bg-amber-50 text-anac-warning'
      }`}
    >
      {children}
    </div>
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
      <dt className="text-xs font-medium text-anac-muted">{label}</dt>
      <dd className="text-anac-navy">{value}</dd>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  first = false,
  last = false,
}: {
  label: string;
  date: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <li className="grid grid-cols-[18px_1fr] gap-3">
      <span className="relative flex justify-center">
        {!first && <span className="absolute top-0 h-3 w-px bg-anac-border" />}
        <span className="mt-3 size-2.5 rounded-full border-2 border-anac-blue bg-white" />
        {!last && <span className="absolute bottom-0 top-5 w-px bg-anac-border" />}
      </span>
      <span className="pb-4">
        <span className="block font-semibold text-anac-navy">{label}</span>
        <span className="text-xs text-anac-muted">{date}</span>
      </span>
    </li>
  );
}

function DossierLink({
  icon: Icon,
  label,
  helper,
}: {
  icon: React.ElementType;
  label: string;
  helper: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-anac-border px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-anac-blue">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-anac-navy">{label}</span>
        <span className="text-xs text-anac-muted">{helper}</span>
      </span>
    </div>
  );
}

function InfoBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-anac-border p-4">
      <div className="flex items-center gap-2 text-anac-blue">{icon}</div>
      <p className="mt-2 text-xs text-anac-muted">{label}</p>
      <p className="mt-1 font-semibold text-anac-navy">{value}</p>
    </div>
  );
}
