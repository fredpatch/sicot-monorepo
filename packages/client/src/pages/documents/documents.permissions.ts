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

export interface DocumentCapabilities {
  canUpload: boolean;
  canChangeCategory: boolean;
  canCorrectOcr: boolean;
  canRetryOcr: boolean;
  canTranslate: boolean;
  canManagePortal: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canOpen: boolean;
}

// Point d'entrée unique pour toute décision d'affichage/action liée à un
// document — évite de disperser des `role === 'agent'` dans les colonnes,
// le panneau de détail et le menu d'actions. Les capacités liées à l'état du
// document (OCR/traduction) restent indépendantes du rôle une fois
// `canManageDocuments`/`canManagePortail` acquis.
export function getDocumentCapabilities(
  role: string | undefined,
  doc: { statutOCR: string }
): DocumentCapabilities {
  const peutGerer = canManageDocuments(role);

  return {
    canUpload: peutGerer,
    canChangeCategory: peutGerer,
    canCorrectOcr: peutGerer,
    canRetryOcr: peutGerer && (doc.statutOCR === 'echec' || doc.statutOCR === 'a_retraiter'),
    // texteExtrait n'est plus renvoyé par le listing (voir documents.service.ts
    // côté serveur) : statutOCR === 'traite' implique déjà un texte extrait
    // non vide (seul cas où le serveur écrit ce statut), donc suffisant comme
    // condition d'éligibilité sans devoir charger le détail complet.
    canTranslate: peutGerer && doc.statutOCR === 'traite',
    canManagePortal: canManagePortail(role),
    canDelete: peutGerer,
    canDownload: true,
    canOpen: true,
  };
}
