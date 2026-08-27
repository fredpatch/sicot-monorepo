// packages/client/src/pages/utilisateurs/components/UserWorkspace.tsx
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { confirmToast } from '@/lib/confirm-toast';
import { usersApi } from '@/lib/users.api';
import { personnelAnacApi } from '@/lib/personnel-anac.api';
import { BadgeRole } from './RolesBadge';
import { BadgeStatutCompte } from './AccountStatusBadge';
import { BadgePremiereConnexion } from './OnboardingBadge';
import { getInitiales, formaterDateHeure } from '../users.utils';
import { getUserCapabilities, isCurrentUser } from '../users.permissions';
import type { Utilisateur, UtilisateurDetail, PersonnelAnacResultat } from '../users.types';

interface UserWorkspaceProps {
  utilisateur: Utilisateur | null;
  currentUserId: number | undefined;
  onOpenChange: (open: boolean) => void;
  onModifier: (u: Utilisateur) => void;
  onReinitialiserOTP: (id: number) => void;
  reinitialiserOTPEnCours: boolean;
  onToggleActivation: (id: number, actif: boolean) => void;
  toggleActivationEnCours: boolean;
}

// Panneau de travail de l'utilisateur sélectionné, implémenté en Dialog+Tabs
// (aucun primitive Sheet/drawer n'existe dans l'app à ce jour — même motif
// que DocumentWorkspace/RequestWorkspace/TermWorkspace).
export function UserWorkspace({
  utilisateur: u,
  currentUserId,
  onOpenChange,
  onModifier,
  onReinitialiserOTP,
  reinitialiserOTPEnCours,
  onToggleActivation,
  toggleActivationEnCours,
}: UserWorkspaceProps) {
  const { data: detail } = useQuery({
    queryKey: ['utilisateurs', u?.id, 'detail'],
    queryFn: async () => {
      const { data } = await usersApi.getById(u!.id);
      return data as UtilisateurDetail;
    },
    enabled: !!u,
  });

  // Enrichissement Personnel ANAC — lecture seule, une seule requête sur
  // sélection (jamais un lookup par ligne du tableau). Échec/absence de
  // correspondance = simplement pas d'onglet, pas d'erreur bloquante.
  const { data: personnel } = useQuery({
    queryKey: ['personnel-anac', 'matricule', u?.matricule],
    queryFn: async () => {
      const { data } = await personnelAnacApi.getParMatricule(u!.matricule);
      return data as PersonnelAnacResultat;
    },
    enabled: !!u,
    retry: false,
  });

  if (!u) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const displayUser = detail ?? u;
  const cap = getUserCapabilities(currentUserId, displayUser);
  const soiMeme = isCurrentUser(currentUserId, displayUser);

  return (
    <Dialog open={!!u} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-anac-navy/8 text-sm font-semibold text-anac-navy"
                aria-label={`Initiales de ${displayUser.prenom} ${displayUser.nom}`}
              >
                {getInitiales(displayUser.prenom, displayUser.nom)}
              </div>
              <div>
                <DialogTitle className="text-base">
                  {displayUser.prenom} {displayUser.nom}
                </DialogTitle>
                <DialogDescription>
                  <BadgeRole role={displayUser.role} /> · {displayUser.email}
                </DialogDescription>
              </div>
            </div>
            <BadgeStatutCompte actif={displayUser.actif} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => onModifier(displayUser)}>
              Modifier le compte
            </Button>
            {cap.canActivate && (
              <Button size="sm" disabled={toggleActivationEnCours} onClick={() => onToggleActivation(u.id, true)}>
                Activer
              </Button>
            )}
            {cap.canDeactivate && (
              <Button
                variant="secondary"
                size="sm"
                disabled={toggleActivationEnCours}
                onClick={() =>
                  confirmToast(`Désactiver le compte de ${displayUser.prenom} ${displayUser.nom} ?`, () =>
                    onToggleActivation(u.id, false)
                  )
                }
                className="text-anac-danger hover:text-anac-danger"
              >
                Désactiver
              </Button>
            )}
          </div>
        </DialogHeader>

        <DialogBody>
          <Tabs defaultValue="informations">
            <TabsList>
              <TabsTrigger value="informations">Informations</TabsTrigger>
              <TabsTrigger value="compte">Compte &amp; accès</TabsTrigger>
              <TabsTrigger value="securite">Sécurité</TabsTrigger>
              {personnel && <TabsTrigger value="anac">Personnel ANAC</TabsTrigger>}
            </TabsList>

            <TabsContent value="informations" className="pt-4 text-sm">
              <dl className="grid grid-cols-[160px_1fr] gap-y-2.5">
                <dt className="text-anac-muted">Nom complet</dt>
                <dd className="text-anac-text">
                  {displayUser.prenom} {displayUser.nom}
                </dd>

                <dt className="text-anac-muted">Matricule</dt>
                <dd className="font-mono text-xs text-anac-text">{displayUser.matricule}</dd>

                <dt className="text-anac-muted">Email</dt>
                <dd className="text-anac-text">{displayUser.email}</dd>

                <dt className="text-anac-muted">Rôle</dt>
                <dd>
                  <BadgeRole role={displayUser.role} />
                </dd>

                <dt className="text-anac-muted">Poste</dt>
                <dd className="text-anac-text">{displayUser.poste ?? 'Non renseigné'}</dd>

                <dt className="text-anac-muted">Direction</dt>
                <dd className="text-anac-text">{displayUser.direction ?? 'Non renseigné'}</dd>

                <dt className="text-anac-muted">Service</dt>
                <dd className="text-anac-text">{displayUser.service ?? 'Non renseigné'}</dd>

                <dt className="text-anac-muted">Créé le</dt>
                <dd className="text-anac-text">{formaterDateHeure(displayUser.createdAt)}</dd>

                <dt className="text-anac-muted">Mis à jour le</dt>
                <dd className="text-anac-text">{formaterDateHeure(displayUser.updatedAt)}</dd>
              </dl>
              {!displayUser.poste && !displayUser.direction && !displayUser.service && (
                <p className="pt-3 text-[11px] text-anac-muted">
                  Poste/Direction/Service ne sont renseignés que pour les comptes créés depuis l&apos;annuaire
                  Personnel ANAC.
                </p>
              )}
            </TabsContent>

            <TabsContent value="compte" className="pt-4 text-sm">
              <dl className="grid grid-cols-[160px_1fr] gap-y-2.5">
                <dt className="text-anac-muted">Rôle</dt>
                <dd>
                  <BadgeRole role={displayUser.role} />
                </dd>

                <dt className="text-anac-muted">Statut du compte</dt>
                <dd>
                  <BadgeStatutCompte actif={displayUser.actif} />
                </dd>

                <dt className="text-anac-muted">Première connexion</dt>
                <dd>
                  <BadgePremiereConnexion premiereConnexion={displayUser.premiereConnexion} />
                </dd>
              </dl>

              {soiMeme && (
                <p className="pt-3 text-[11px] text-anac-muted">
                  Vous ne pouvez pas désactiver votre propre compte.
                </p>
              )}
              {!soiMeme && displayUser.role === 'super_admin' && (
                <p className="pt-3 text-[11px] text-anac-muted">
                  Un compte Super Administrateur ne peut pas être désactivé.
                </p>
              )}
            </TabsContent>

            <TabsContent value="securite" className="space-y-4 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-anac-muted">Dernière connexion</span>
                <span className="text-anac-text">
                  {detail ? (
                    formaterDateHeure(detail.derniereConnexion)
                  ) : (
                    <Loader2 size={13} className="animate-spin text-anac-muted" />
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-anac-border p-3">
                <div>
                  <p className="font-medium text-anac-navy">Code OTP</p>
                  <p className="text-xs text-anac-muted">Un nouveau code sera envoyé par email.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!cap.canResetOtp || reinitialiserOTPEnCours}
                  onClick={() =>
                    confirmToast(
                      `Réinitialiser l'OTP de ${displayUser.prenom} ${displayUser.nom} ? Un nouveau code sera envoyé par email.`,
                      () => onReinitialiserOTP(u.id)
                    )
                  }
                >
                  {reinitialiserOTPEnCours ? (
                    <>
                      <Loader2 size={13} className="mr-1 animate-spin" /> Réinitialisation…
                    </>
                  ) : (
                    "Réinitialiser l'OTP"
                  )}
                </Button>
              </div>
              {!cap.canResetOtp && (
                <p className="text-[11px] text-anac-muted">
                  Le compte doit être actif pour réinitialiser son OTP.
                </p>
              )}
            </TabsContent>

            {personnel && (
              <TabsContent value="anac" className="pt-4 text-sm">
                <p className="pb-3 text-[11px] text-anac-muted">
                  Annuaire Personnel ANAC — lecture seule, non synchronisé vers le compte SICOT.
                </p>
                <dl className="grid grid-cols-[160px_1fr] gap-y-2.5">
                  <dt className="text-anac-muted">Poste</dt>
                  <dd className="text-anac-text">{personnel.poste ?? '—'}</dd>

                  <dt className="text-anac-muted">Service</dt>
                  <dd className="text-anac-text">{personnel.service ?? '—'}</dd>

                  <dt className="text-anac-muted">Direction</dt>
                  <dd className="text-anac-text">{personnel.direction ?? '—'}</dd>

                  <dt className="text-anac-muted">Organisation</dt>
                  <dd className="text-anac-text">{personnel.organisationLabel ?? '—'}</dd>
                </dl>
              </TabsContent>
            )}
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
