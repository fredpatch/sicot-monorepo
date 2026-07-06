// packages/client/src/pages/utilisateurs/components/BadgeRole.tsx
import type { UserRole } from '@sicot/shared';
import { ROLES } from '../users.constants';

export function BadgeRole({ role }: { role: UserRole }) {
  const label = ROLES.find((r) => r.value === role)?.label ?? role;
  const classe = role === 'admin' || role === 'super_admin' ? 'badge-info' : 'badge-neutre';
  return <span className={classe}>{label}</span>;
}