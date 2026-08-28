// packages/client/src/pages/missions/missions.permissions.ts
//
// Client-side action matrix for mission mutation controls - extracted
// during the Phase 10.2 authorization-alignment fix, mirrors
// missions.route.ts exactly: MISSION_MANAGE for mission/participant/report
// mutations, MISSION_RECOMMENDATION_MANAGE for recommendation mutations.
// Read-only sections (participants list, report info, recommendations
// list, notification history) stay visible regardless - only the mutating
// controls are capability-gated. Before this fix, every mutating control on
// /missions/:id was gated purely on mission workflow state (e.g. statut !==
// 'annulee'), relying entirely on the server's 403 to stop an unauthorized
// action; no live role could hit that gap (MISSION_REGISTRY_VIEW/MANAGE/
// RECOMMENDATION_MANAGE are bundled together for admin+), but the frontend
// should express the real capability contract rather than today's role
// bundling.
import { hasCapability, type UserRole } from '@sicot/shared';

interface MissionUser {
  role: UserRole;
}

export function canManageMission(user: MissionUser | null | undefined): boolean {
  return !!user && hasCapability(user.role, 'MISSION_MANAGE');
}

export function canManageRecommendations(user: MissionUser | null | undefined): boolean {
  return !!user && hasCapability(user.role, 'MISSION_RECOMMENDATION_MANAGE');
}
