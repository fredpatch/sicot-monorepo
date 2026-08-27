// packages/shared/src/auth/capabilities.ts
// Capability = a category of action a user may perform, independent of which
// specific record it targets. Contextual/ownership checks (e.g. "is this
// their own request?") live next to the relevant domain module, not here.

export type Capability =
  | 'PERSONAL_WORKSPACE_VIEW'
  | 'REQUEST_CREATE_OWN'
  | 'REQUEST_VIEW_OWN'
  | 'REQUEST_RECALL_OWN'
  | 'REQUEST_QUEUE_VIEW'
  | 'REQUEST_TAKE'
  | 'REQUEST_SUBMIT_REVIEW'
  | 'REQUEST_PRIORITY_VALIDATE'
  | 'REQUEST_VALIDATE'
  | 'REQUEST_ARCHIVE'
  | 'TRANSLATION_VIEW'
  | 'TRANSLATION_PROCESS'
  | 'TRANSLATION_REVIEW'
  | 'TRANSLATION_APPROVE'
  | 'TRANSLATION_ARCHIVE'
  | 'GLOSSARY_VIEW'
  | 'GLOSSARY_MANAGE'
  | 'MISSION_VIEW_OWN'
  | 'MISSION_REPORT_SUBMIT_OWN'
  | 'MISSION_REGISTRY_VIEW'
  | 'MISSION_MANAGE'
  | 'MISSION_RECOMMENDATION_MANAGE'
  | 'AGREEMENT_VIEW'
  | 'AGREEMENT_MANAGE'
  | 'PARTNER_VIEW'
  | 'PARTNER_MANAGE'
  | 'CORRESPONDENCE_VIEW'
  | 'CORRESPONDENCE_MANAGE'
  | 'DOCUMENT_VIEW_ALLOWED'
  | 'DOCUMENT_DOWNLOAD_ALLOWED'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_OCR_MANAGE'
  | 'DOCUMENT_CATEGORY_MANAGE'
  | 'DOCUMENT_INTERNAL_VISIBILITY_MANAGE'
  | 'DOCUMENT_DELETE'
  | 'PORTAL_PUBLICATION_MANAGE'
  | 'USER_DIRECTORY_VIEW'
  | 'USER_MANAGE'
  | 'ANALYTICS_VIEW'
  | 'AUDIT_VIEW'
  | 'ADMIN_MONITORING_VIEW'
  | 'JOB_EXECUTE'
  // Distinguishes ordinary maintenance jobs (JOB_EXECUTE, admin+) from
  // high-risk system-level ones — backups, NAS sync — where a mistake is
  // costly or hard to reverse. super_admin only. One capability covering
  // this whole risk tier, not one per job (Phase 4.8.3).
  | 'SYSTEM_ADMIN_OPERATION'
  | 'SYSTEM_SETTINGS_VIEW'
  | 'SYSTEM_SETTINGS_MANAGE';
