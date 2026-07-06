// packages/client/src/pages/AdminUsersPage.tsx
import { useState } from 'react';
import { Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { OngletUtilisateurs } from './users/components/tabs/UsersTab';
import { OngletPersonnelAnac } from './users/components/tabs/PersonnelAnacTab';
import { CreerUtilisateurDialog } from './users/components/CreateUserDialog';
import { useUtilisateursMutations } from './users/hooks/mutations';
import type { PersonnelAnacResultat, PrefillUtilisateur } from './users/users.types';

export default function AdminUsersPage() {
  const [onglet, setOnglet] = useState<'utilisateurs' | 'personnel-anac'>('utilisateurs');
  const [modalCreer, setModalCreer] = useState(false);
  const [prefill, setPrefill] = useState<PrefillUtilisateur | undefined>(undefined);

  const { creerMutation } = useUtilisateursMutations({
    onCree: () => {
      setModalCreer(false);
      setPrefill(undefined);
      setOnglet('utilisateurs'); // pour voir immédiatement le compte créé, si on venait de l'onglet Personnel ANAC
    },
  });

  function ouvrirCreationManuelle() {
    setPrefill(undefined);
    setModalCreer(true);
  }

  function ouvrirCreationDepuisAnac(personnel: PersonnelAnacResultat) {
    setPrefill({
      matricule: personnel.matricule,
      nom: personnel.nom ?? '',
      prenom: personnel.prenom ?? '',
    });
    setModalCreer(true);
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center">
            <Users size={18} className="text-anac-navy" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-anac-navy">Utilisateurs</h2>
            <p className="text-anac-muted text-sm mt-0.5">
              Comptes SICOT, activation, OTP, et annuaire Personnel ANAC
            </p>
          </div>
        </div>
        {onglet === 'utilisateurs' && <Button onClick={ouvrirCreationManuelle}>Nouvel utilisateur</Button>}
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────── */}
      <Tabs value={onglet} onValueChange={(v) => setOnglet(v as 'utilisateurs' | 'personnel-anac')}>
        <TabsList>
          <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="personnel-anac">Personnel ANAC</TabsTrigger>
        </TabsList>

        <TabsContent value="utilisateurs">
          <OngletUtilisateurs />
        </TabsContent>
        <TabsContent value="personnel-anac">
          <OngletPersonnelAnac onCreerCompte={ouvrirCreationDepuisAnac} />
        </TabsContent>
      </Tabs>

      {/* ── Dialog partagé : création (manuelle ou pré-remplie depuis ANAC) ── */}
      <CreerUtilisateurDialog
        key={prefill?.matricule ?? 'manuel'}
        open={modalCreer}
        onOpenChange={(open) => {
          setModalCreer(open);
          if (!open) setPrefill(undefined);
        }}
        onSubmit={(data) => creerMutation.mutate(data)}
        chargement={creerMutation.isPending}
        prefill={prefill}
      />
    </div>
  );
}