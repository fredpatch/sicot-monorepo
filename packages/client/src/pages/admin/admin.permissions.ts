// packages/client/src/pages/admin/admin.permissions.ts
//
// Mirrors the real server-side gates exactly (Phase 1 audit, Phase 4.8.2/
// 4.8.3): GET /parametres → SYSTEM_SETTINGS_VIEW, PATCH /parametres/:cle →
// SYSTEM_SETTINGS_MANAGE (super_admin only); GET/POST /jobs → JOB_EXECUTE
// at the route, then each job's own executionCapability checked directly
// in jobs.service.ts. Centralized here instead of scattered role
// comparisons.
import { hasCapability, type UserRole } from '@sicot/shared';
import type { JobDisponible } from './admin.types';

// SYSTEM_SETTINGS_MANAGE is deliberately absent from ADMIN_CAPABILITIES in
// the shared role-capability matrix (packages/shared/src/auth/
// role-capabilities.ts) — super_admin only, enforced by the capability
// mapping itself rather than a role-literal comparison here (Phase 5.3).
export function canEditParameter(role: UserRole | undefined): boolean {
  return !!role && hasCapability(role, 'SYSTEM_SETTINGS_MANAGE');
}

export function canRunJob(role: UserRole | undefined, job: JobDisponible): boolean {
  if (!role) return false;
  return hasCapability(role, job.executionCapability);
}
