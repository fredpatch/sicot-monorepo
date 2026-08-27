// packages/client/src/lib/landing.ts
//
// Single source of truth for "where does this role land after login" — used
// by LoginPage (post-login navigate), the root/wildcard route redirect, and
// every CapabilityRoute denial fallback (App.tsx), so they all stay in
// sync and no combination of them can produce a redirect loop.
//
// Derived from capability tier, not a role-name switch (Phase 5.1) —
// three tiers, each landing on the route CapabilityRoute gates with the
// exact same capability used here as the discriminator:
//   - lacks REQUEST_QUEUE_VIEW (agent tier)   → /mon-espace
//   - lacks ANALYTICS_VIEW (operateur tier)   → /demandes (operational landing)
//   - has ANALYTICS_VIEW (admin/super_admin)  → /dashboard (cross-module business overview)
import { hasCapability, type UserRole } from '@sicot/shared';

export function getLandingRoute(role: UserRole | undefined): string {
  if (!role) return '/login';
  if (!hasCapability(role, 'REQUEST_QUEUE_VIEW')) return '/mon-espace';
  if (!hasCapability(role, 'ANALYTICS_VIEW')) return '/demandes';
  return '/dashboard';
}
