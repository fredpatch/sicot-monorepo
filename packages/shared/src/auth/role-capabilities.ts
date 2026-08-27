// packages/shared/src/auth/role-capabilities.ts
// Single source of truth for role -> capability. Composed additively
// (each tier = the one below it plus what's new) so the "operateur has
// everything agent has, plus..." relationship stays visible in the code
// instead of being restated by hand per role.

import type { Capability } from './capabilities';
import type { UserRole } from './roles';

const AGENT_CAPABILITIES: readonly Capability[] = [
  'PERSONAL_WORKSPACE_VIEW',
  'REQUEST_CREATE_OWN',
  'REQUEST_VIEW_OWN',
  'REQUEST_RECALL_OWN',
  'MISSION_VIEW_OWN',
  'MISSION_REPORT_SUBMIT_OWN',
  'DOCUMENT_VIEW_ALLOWED',
  'DOCUMENT_DOWNLOAD_ALLOWED',
  'USER_DIRECTORY_VIEW',
];

const OPERATEUR_CAPABILITIES: readonly Capability[] = [
  ...AGENT_CAPABILITIES,
  'REQUEST_QUEUE_VIEW',
  'REQUEST_TAKE',
  'REQUEST_SUBMIT_REVIEW',
  'REQUEST_PRIORITY_VALIDATE',
  'REQUEST_VALIDATE',
  'REQUEST_ARCHIVE',
  'TRANSLATION_VIEW',
  'TRANSLATION_PROCESS',
  'TRANSLATION_REVIEW',
  'TRANSLATION_APPROVE',
  'TRANSLATION_ARCHIVE',
  'GLOSSARY_VIEW',
  'GLOSSARY_MANAGE',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_OCR_MANAGE',
  'DOCUMENT_CATEGORY_MANAGE',
  'DOCUMENT_INTERNAL_VISIBILITY_MANAGE',
  'DOCUMENT_DELETE',
];

const ADMIN_CAPABILITIES: readonly Capability[] = [
  ...OPERATEUR_CAPABILITIES,
  'MISSION_REGISTRY_VIEW',
  'MISSION_MANAGE',
  'MISSION_RECOMMENDATION_MANAGE',
  'AGREEMENT_VIEW',
  'AGREEMENT_MANAGE',
  'PARTNER_VIEW',
  'PARTNER_MANAGE',
  'CORRESPONDENCE_VIEW',
  'CORRESPONDENCE_MANAGE',
  'PORTAL_PUBLICATION_MANAGE',
  'USER_MANAGE',
  'ANALYTICS_VIEW',
  'AUDIT_VIEW',
  'ADMIN_MONITORING_VIEW',
  'JOB_EXECUTE',
  'SYSTEM_SETTINGS_VIEW',
];

const SUPER_ADMIN_CAPABILITIES: readonly Capability[] = [
  ...ADMIN_CAPABILITIES,
  'SYSTEM_SETTINGS_MANAGE',
  'SYSTEM_ADMIN_OPERATION',
];

export const ROLE_CAPABILITIES: Readonly<Record<UserRole, readonly Capability[]>> = {
  agent: AGENT_CAPABILITIES,
  operateur: OPERATEUR_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
  super_admin: SUPER_ADMIN_CAPABILITIES,
};

/**
 * Does this role carry this capability?
 *
 * Fails closed: an unrecognized role string (corrupted session, stale JWT
 * from a role value that no longer exists, bad input) has no entry in
 * ROLE_CAPABILITIES and is treated as having no capabilities, rather than
 * throwing. Deny (403), don't crash (500).
 */
export function hasCapability(role: UserRole, capability: Capability): boolean {
  const capabilities = ROLE_CAPABILITIES[role];
  return capabilities ? capabilities.includes(capability) : false;
}

export function hasAnyCapability(role: UserRole, capabilities: readonly Capability[]): boolean {
  return capabilities.some((capability) => hasCapability(role, capability));
}

export function hasAllCapabilities(role: UserRole, capabilities: readonly Capability[]): boolean {
  return capabilities.every((capability) => hasCapability(role, capability));
}
