// packages/client/src/pages/admin/admin.permissions.ts
//
// Mirrors the real server-side gates exactly (Phase 1 audit):
// GET /parametres → admin+, PATCH /parametres/:cle → super_admin only;
// GET/POST /jobs → admin+ at the route, then a per-job roleMinimum check in
// jobs.service.ts. Centralized here instead of scattered role comparisons.
import type { JobDisponible } from './admin.types';

const ROLE_LEVEL: Record<string, number> = {
  agent: 1,
  traducteur: 2,
  relecteur: 3,
  admin: 4,
  super_admin: 5,
};

function roleAtLeast(role: string | undefined, minimum: string): boolean {
  return (ROLE_LEVEL[role ?? ''] ?? 0) >= ROLE_LEVEL[minimum];
}

export function canEditParameter(role: string | undefined): boolean {
  return role === 'super_admin';
}

export function canRunJob(role: string | undefined, job: JobDisponible): boolean {
  return roleAtLeast(role, job.roleMinimum);
}
