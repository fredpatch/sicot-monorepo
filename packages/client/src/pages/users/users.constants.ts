// packages/client/src/pages/utilisateurs/utilisateurs.constants.ts
import type { UserRole } from '@sicot/shared';

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'traducteur', label: 'Traducteur' },
  { value: 'relecteur', label: 'Relecteur' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

export const FILTRES_ROLE = [{ value: '__all__', label: 'Tous les rôles' }, ...ROLES];

export const FILTRES_STATUT = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'true', label: 'Actifs' },
  { value: 'false', label: 'Inactifs' },
];