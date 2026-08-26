// packages/client/src/lib/landing.ts
//
// Single source of truth for "where does this role land after login" — used
// by LoginPage (post-login navigate), the root/wildcard route redirect, and
// the /dashboard route guard, so the three stay in sync.
export function getLandingRoute(role: string | undefined): string {
  return role === 'agent' ? '/mon-espace' : '/dashboard';
}
