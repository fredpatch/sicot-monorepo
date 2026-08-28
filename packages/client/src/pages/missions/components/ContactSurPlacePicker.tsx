import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserPlus, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contactsApi, type ContactListItem } from '@/lib/contacts.api';
import type { ContactResume } from '../mission.types';
import { QuickCreateContactDialog } from './QuickCreateContactDialog';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

// Replaces the old N+1 pattern (fetch every organisation, then every
// organisation's contacts) with a single search against GET /api/contacts.
export function ContactSurPlacePicker({
  initialContact,
  onChange,
}: {
  initialContact?: ContactResume;
  onChange: (contact: ContactListItem | ContactResume | undefined) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContactListItem | ContactResume | undefined>(
    initialContact
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const contactsQuery = useQuery({
    queryKey: ['contacts-recherche', debouncedSearch],
    queryFn: async () => {
      const res = await contactsApi.lister({
        search: debouncedSearch || undefined,
        actif: true,
        pageSize: 50,
      });
      return res.data as { data: ContactListItem[] };
    },
    enabled: !selected && (search.length === 0 || search.length >= 2),
  });

  const results = useMemo(() => contactsQuery.data?.data ?? [], [contactsQuery.data]);

  function select(contact: ContactListItem | ContactResume | undefined) {
    setSelected(contact);
    onChange(contact);
  }

  if (selected) {
    return (
      <div>
        <Label>Contact sur place</Label>
        <div className="mt-2 flex items-center justify-between rounded-md border border-anac-border bg-white px-4 py-3">
          <span>
            <span className="block font-medium text-anac-navy">
              {selected.prenom} {selected.nom}
            </span>
            {selected.organisationNom && (
              <span className="text-xs text-anac-muted">{selected.organisationNom}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => select(undefined)}
            className="text-anac-muted hover:text-anac-danger"
            aria-label="Retirer le contact sur place"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label>Contact sur place</Label>
      <p className="mt-1 text-xs text-anac-muted">
        Aucun contact sur place pour le moment - optionnel.
      </p>
      <div className="relative mt-2">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          placeholder="Rechercher un contact ou une organisation..."
        />
      </div>
      <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-anac-border">
        {contactsQuery.isLoading ? (
          <div className="flex items-center justify-center py-6 text-anac-muted">
            <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" />
            Recherche...
          </div>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-anac-muted">
            {search ? 'Aucun contact trouvé.' : 'Commencez à taper pour rechercher un contact.'}
          </p>
        ) : (
          results.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => select(contact)}
              className="flex w-full items-center justify-between border-b border-anac-border px-4 py-3 text-left last:border-b-0 hover:bg-anac-gray"
            >
              <span>
                <span className="block font-medium text-anac-navy">
                  {contact.prenom} {contact.nom}
                </span>
                <span className="text-xs text-anac-muted">{contact.organisationNom}</span>
              </span>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setCreateDialogOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
      >
        <UserPlus size={14} aria-hidden="true" />
        Le contact recherché n&apos;existe pas ? Le créer
      </button>

      <QuickCreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(contact) => {
          setCreateDialogOpen(false);
          select(contact);
        }}
      />
    </div>
  );
}
