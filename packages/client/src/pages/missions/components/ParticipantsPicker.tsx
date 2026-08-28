import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

import { hasCapability } from '@sicot/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi } from '@/lib/users.api';
import { CreerUtilisateurDialog } from '@/pages/users/components/CreateUserDialog';
import type { CreerUtilisateurFormData } from '@/pages/users/users.schemas';
import { useAuth } from '@/App';
import type { ParticipantResume } from '../mission.types';

interface UserOption {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
}

// Two-panel searchable participant picker, shared between the guided
// creation Step 3 and the edit form's Participants section - plus the
// "quick-create a participant" addition: an admin/super_admin can create a
// new ANAC agent account inline (embedding the exact same CreateUserDialog
// the admin Users page uses, so validation/OTP-dispatch/audit-log stay a
// single code path, never duplicated).
export function ParticipantsPicker({
  value,
  onChange,
  error,
}: {
  value: number[];
  onChange: (value: number[]) => void;
  error?: string;
}) {
  const { user } = useAuth();
  // Cet ajout rapide appelle POST /api/users (embarque CreerUtilisateurDialog)
  // - même capacité que la page Utilisateurs, USER_MANAGE, pas un tableau de
  // rôles codé en dur ici (Phase 5.3). Ce tableau avait été manqué par le
  // grep initial (syntaxe .includes(), pas role === /!==).
  const canCreateUsers = !!user && hasCapability(user.role, 'USER_MANAGE');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['users-liste'],
    queryFn: async () => {
      const res = await usersApi.lister({ pageSize: 200 });
      return res.data as { data: UserOption[]; total: number };
    },
  });

  const allUsers = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);

  const selected = useMemo(
    () => allUsers.filter((agent) => value.includes(agent.id)),
    [allUsers, value]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allUsers;
    return allUsers.filter((agent) =>
      `${agent.nom} ${agent.prenom} ${agent.matricule}`.toLowerCase().includes(query)
    );
  }, [allUsers, search]);

  const createMutation = useMutation({
    mutationFn: (data: CreerUtilisateurFormData) => usersApi.creer(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users-liste'] });
      setCreateDialogOpen(false);
      const created = res.data as UserOption & { emailEnvoye: boolean };
      onChange([...value, created.id]);
      toast.success(`${created.prenom} ${created.nom} a été créé et ajouté aux participants.`);
      if (!res.data.emailEnvoye) {
        toast.warning("L'OTP n'a pas pu être envoyé par email - vérifiez la configuration SMTP.");
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la création du compte.';
      toast.error(msg);
    },
  });

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <Label>Agents disponibles</Label>
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
            placeholder="Rechercher un agent, un matricule..."
          />
        </div>

        <div
          className={`mt-3 max-h-72 overflow-y-auto rounded-md border ${error ? 'border-anac-danger' : 'border-anac-border'}`}
        >
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-anac-muted">
              <Loader2 size={15} className="mr-2 animate-spin" aria-hidden="true" />
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-anac-muted">Aucun agent trouvé.</p>
          ) : (
            filtered.map((agent) => (
              <label
                key={agent.id}
                className="flex cursor-pointer items-center gap-3 border-b border-anac-border px-4 py-3 last:border-b-0 hover:bg-anac-gray"
              >
                <input
                  type="checkbox"
                  checked={value.includes(agent.id)}
                  onChange={() => toggle(agent.id)}
                  className="size-4 rounded border-anac-border text-anac-blue focus:ring-anac-sky"
                />
                <span>
                  <span className="block font-medium text-anac-navy">
                    {agent.prenom} {agent.nom}
                  </span>
                  <span className="text-xs text-anac-muted">{agent.matricule}</span>
                </span>
              </label>
            ))
          )}
        </div>
        {error && <p className="mt-2 text-xs text-anac-danger">{error}</p>}

        {canCreateUsers ? (
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-anac-blue outline-none hover:underline focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            <UserPlus size={14} aria-hidden="true" />
            La personne recherchée n&apos;existe pas ? Créer un nouvel agent
          </button>
        ) : (
          <p className="mt-3 text-xs text-anac-muted">
            La personne recherchée n&apos;a pas de compte ? Un administrateur peut en créer un.
          </p>
        )}
      </div>

      <aside className="rounded-md border border-anac-border bg-anac-gray p-4">
        <h4 className="font-semibold text-anac-navy">Participants sélectionnés</h4>
        <p className="mt-1 text-sm text-anac-muted">
          {selected.length} participant{selected.length > 1 ? 's' : ''}
        </p>
        <div className="mt-4 space-y-2">
          {selected.length === 0 ? (
            <p className="text-sm text-anac-muted">Aucun participant sélectionné.</p>
          ) : (
            selected.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between gap-3 rounded border border-anac-border bg-white px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-anac-navy">
                    {agent.prenom} {agent.nom}
                  </span>
                  <span className="text-xs text-anac-muted">{agent.matricule}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggle(agent.id)}
                  className="text-anac-muted hover:text-anac-danger"
                  aria-label={`Retirer ${agent.prenom} ${agent.nom}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {canCreateUsers && (
        <CreerUtilisateurDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={(data) => createMutation.mutate(data)}
          chargement={createMutation.isPending}
        />
      )}
    </div>
  );
}

export type { ParticipantResume };
