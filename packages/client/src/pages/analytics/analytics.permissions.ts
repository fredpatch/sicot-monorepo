// packages/client/src/pages/analytics/analytics.permissions.ts
//
// Mirrors the server-side capability gates exactly (packages/server/src/
// modules/analytics/routes/analytics.route.ts): the whole /analytics API
// already requires ANALYTICS_VIEW at the router level, including
// POST /rapports/:id/analyse-ia (generating the AI analysis) - only the
// PATCH .../analyse-ia (validating/rejecting it) requires the narrower
// ADMIN_MONITORING_VIEW. Fixed during Phase 10.7's alignment audit:
// ReportsTab.tsx previously gated the "Générer l'analyse IA" triggers on
// ADMIN_MONITORING_VIEW too, based on a comment asserting the server used
// the same capability for both - it doesn't. Not a live gap today
// (ANALYTICS_VIEW and ADMIN_MONITORING_VIEW are bundled at the same admin
// tier), but the client should express the real per-action contract.
import { hasCapability, type UserRole } from '@sicot/shared';

export function canValidateAnalyticsReport(role: UserRole | undefined): boolean {
  return !!role && hasCapability(role, 'ADMIN_MONITORING_VIEW');
}
