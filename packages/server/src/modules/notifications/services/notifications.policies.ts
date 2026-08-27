// packages/server/src/modules/notifications/services/notifications.policies.ts
//
// Phase 7.1 remediation. Notification history/send previously had no
// per-entity authorization at all (any authenticated user could read/send
// for any entiteId — see prompt.md phase 7.1 audit). There is no single
// capability that fits every notification type: each type belongs to a
// different domain, so authorization is derived from that domain's own
// capabilities, with a contextual fallback only where the data model
// actually supports a personal relationship (recommandations.responsableId).
// accord_echeance/courrier_relance have no such personal-owner field in the
// schema (see db/schema.ts — accords/courriers carry no FK to an assigned
// user other than createdPar/organisation contacts), so those stay strictly
// admin+ via AGREEMENT_*/CORRESPONDENCE_*. No NOTIFICATION_MANAGE capability
// is introduced — every check below reuses an existing domain capability.
import { hasCapability, type UserRole } from '@sicot/shared';
import { estResponsableRecommandation } from '@/modules/missions/services/missions.service';
import type { NotificationType } from './notifications.types';

export async function peutConsulterHistorique(
  role: UserRole,
  type: NotificationType,
  entiteId: number,
  userId: number
): Promise<boolean> {
  switch (type) {
    case 'accord_echeance':
      return hasCapability(role, 'AGREEMENT_VIEW');
    case 'courrier_relance':
      return hasCapability(role, 'CORRESPONDENCE_VIEW');
    case 'recommandation_rappel':
      if (hasCapability(role, 'MISSION_REGISTRY_VIEW')) return true;
      if (!hasCapability(role, 'MISSION_VIEW_OWN')) return false;
      return estResponsableRecommandation(entiteId, userId);
    default:
      return false;
  }
}

export async function peutEnvoyerNotification(
  role: UserRole,
  type: NotificationType,
  entiteId: number,
  userId: number
): Promise<boolean> {
  switch (type) {
    case 'accord_echeance':
      return hasCapability(role, 'AGREEMENT_MANAGE');
    case 'courrier_relance':
      return hasCapability(role, 'CORRESPONDENCE_MANAGE');
    case 'recommandation_rappel':
      if (hasCapability(role, 'MISSION_RECOMMENDATION_MANAGE')) return true;
      if (!hasCapability(role, 'MISSION_VIEW_OWN')) return false;
      return estResponsableRecommandation(entiteId, userId);
    default:
      return false;
  }
}
