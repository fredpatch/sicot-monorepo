// packages/client/src/pages/documents/documents.permissions.ts
//
// Mirrors the server-side role gates exactly (packages/server/src/modules/
// document/routes/documents.route.ts and portal/routes/portal.route.ts):
// delete/retraiter-ocr/categorie/ocr-correction require traducteur+, portal
// publish/unpublish requires admin+. Upload/list/download stay open to
// everyone, matching the server (no permission needed there).
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

export function canManageDocuments(role: string | undefined): boolean {
  return roleAtLeast(role, 'traducteur');
}

export function canManagePortail(role: string | undefined): boolean {
  return roleAtLeast(role, 'admin');
}
