// packages/client/src/pages/ProfilePage.tsx
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, User2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/auth.api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IdentityCard } from './profil/components/IdentityCard';
import { ChangePasswordForm } from './profil/components/ChangePasswordForm';
import type { MonProfil } from './profil/profil.types';

export default function ProfilePage() {
  const profilQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await authApi.me();
      return res.data as MonProfil;
    },
  });

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header>
        <h2 className="text-2xl font-bold leading-tight text-anac-navy">Mon profil</h2>
        <p className="mt-1 text-sm text-anac-muted">
          Gérez vos informations personnelles et votre mot de passe.
        </p>
      </header>

      {profilQuery.isLoading ? (
        <div className="card flex min-h-64 items-center justify-center text-anac-muted">
          <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
          Chargement de votre profil...
        </div>
      ) : profilQuery.isError || !profilQuery.data ? (
        <div className="card flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="font-semibold text-anac-navy">Impossible de charger votre profil.</p>
          <p className="text-sm text-anac-muted">Vérifiez la connexion au serveur puis réessayez.</p>
          <Button type="button" variant="outline" onClick={() => profilQuery.refetch()} className="gap-2">
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="informations">
          <TabsList>
            <TabsTrigger value="informations" className="gap-1.5">
              <User2 size={13} aria-hidden="true" /> Informations personnelles
            </TabsTrigger>
            <TabsTrigger value="securite" className="gap-1.5">
              <ShieldCheck size={13} aria-hidden="true" /> Sécurité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="informations">
            <IdentityCard profil={profilQuery.data} />
          </TabsContent>

          <TabsContent value="securite">
            <ChangePasswordForm />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
