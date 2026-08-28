import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { organisationsApi } from '@/lib/organisations.api';
import { FormulaireContact } from '@/pages/partenaires/components/FormulaireContact';
import { FormulaireOrganisation } from '@/pages/partenaires/components/FormulaireOrganisation';
import type { ContactFormData, OrgFormData } from '@/pages/partenaires/partenaires.schemas';
import type { ContactListItem } from '@/lib/contacts.api';

interface OrganisationOption {
  id: number;
  nom: string;
  pays: string;
  type: string;
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

// Mirrors the participant quick-create: a "contact on site" is a real
// Partenaires contact, which always belongs to an organisation - so this
// is two layers, not one. Reuses the exact existing FormulaireOrganisation
// / FormulaireContact + organisationsApi calls the admin Partenaires pages
// use, rather than a second, parallel creation path.
export function QuickCreateContactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: ContactListItem) => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'organisation' | 'nouvelle-organisation' | 'contact'>(
    'organisation'
  );
  const [orgSearch, setOrgSearch] = useState('');
  const debouncedOrgSearch = useDebouncedValue(orgSearch);
  const [selectedOrg, setSelectedOrg] = useState<OrganisationOption | null>(null);

  useEffect(() => {
    if (open) {
      setStep('organisation');
      setOrgSearch('');
      setSelectedOrg(null);
    }
  }, [open]);

  const orgsQuery = useQuery({
    queryKey: ['organisations-recherche', debouncedOrgSearch],
    queryFn: async () => {
      const res = await organisationsApi.lister({
        search: debouncedOrgSearch || undefined,
        actif: true,
        pageSize: 30,
      });
      return res.data as { data: OrganisationOption[] };
    },
    enabled: step === 'organisation',
  });

  const createOrgMutation = useMutation({
    mutationFn: (data: OrgFormData) => organisationsApi.creer(data),
    onSuccess: (res) => {
      const org = res.data as OrganisationOption;
      queryClient.invalidateQueries({ queryKey: ['organisations-recherche'] });
      setSelectedOrg(org);
      setStep('contact');
      toast.success(`Organisation "${org.nom}" créée.`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de la création de l'organisation.";
      toast.error(msg);
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: ContactFormData) => organisationsApi.creerContact(selectedOrg!.id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts-recherche'] });
      const contact = res.data as {
        id: number;
        nom: string;
        prenom: string;
        email?: string;
        telephone?: string;
        poste?: string;
      };
      onCreated({ ...contact, organisationId: selectedOrg!.id, organisationNom: selectedOrg!.nom });
      onOpenChange(false);
      toast.success(
        `${contact.prenom} ${contact.nom} a été créé et défini comme contact sur place.`
      );
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la création du contact.';
      toast.error(msg);
    },
  });

  const orgs = useMemo(() => orgsQuery.data?.data ?? [], [orgsQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'contact' ? 'Nouveau contact' : "Sélectionner l'organisation"}
          </DialogTitle>
          <DialogDescription>
            {step === 'contact'
              ? `Chez ${selectedOrg?.nom}`
              : 'Un contact appartient toujours à une organisation partenaire.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'organisation' && (
          <DialogBody className="space-y-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted"
                aria-hidden="true"
              />
              <Input
                value={orgSearch}
                onChange={(event) => setOrgSearch(event.target.value)}
                className="pl-9"
                placeholder="Rechercher une organisation partenaire..."
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-anac-border">
              {orgsQuery.isLoading ? (
                <div className="flex items-center justify-center py-6 text-anac-muted">
                  <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" />
                  Recherche...
                </div>
              ) : orgs.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-anac-muted">
                  Aucune organisation trouvée.
                </p>
              ) : (
                orgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrg(org);
                      setStep('contact');
                    }}
                    className="flex w-full items-center gap-3 border-b border-anac-border px-4 py-3 text-left last:border-b-0 hover:bg-anac-gray"
                  >
                    <Building2 size={15} className="shrink-0 text-anac-muted" aria-hidden="true" />
                    <span>
                      <span className="block font-medium text-anac-navy">{org.nom}</span>
                      <span className="text-xs text-anac-muted">{org.pays}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep('nouvelle-organisation')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
            >
              <Plus size={14} aria-hidden="true" />
              L&apos;organisation n&apos;existe pas ? La créer
            </button>
          </DialogBody>
        )}

        {step === 'nouvelle-organisation' && (
          <DialogBody>
            <FormulaireOrganisation
              onSubmit={(data) => createOrgMutation.mutate(data)}
              onCancel={() => setStep('organisation')}
              chargement={createOrgMutation.isPending}
            />
          </DialogBody>
        )}

        {step === 'contact' && (
          <DialogBody>
            <FormulaireContact
              onSubmit={(data) => createContactMutation.mutate(data)}
              onCancel={() => setStep('organisation')}
              chargement={createContactMutation.isPending}
            />
          </DialogBody>
        )}

        {step === 'organisation' && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
