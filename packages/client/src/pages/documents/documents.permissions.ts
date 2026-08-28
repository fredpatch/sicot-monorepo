// packages/client/src/pages/documents/documents.permissions.ts
//
// Mirrors the server-side capability gates exactly (packages/server/src/
// modules/document/routes/documents.route.ts and portal/routes/
// portal.route.ts, Phase 4.7): each document action carries its own
// DOCUMENT_* capability rather than one shared role tier, portal
// publish/unpublish uses PORTAL_PUBLICATION_MANAGE. Upload/list/download
// stay open to everyone, matching the server - the general upload endpoint
// itself has no capability gate (Phase 4.7's documented reasoning: it
// serves both library management AND personal-workflow attachments), so
// this phase doesn't add one here either (Phase 5.3 - not a new
// authorization architecture for it).
import { hasCapability, type Capability, type UserRole } from '@sicot/shared';

function can(role: UserRole | undefined, capability: Capability): boolean {
  return !!role && hasCapability(role, capability);
}

export function canManageDocuments(role: UserRole | undefined): boolean {
  return can(role, 'DOCUMENT_UPLOAD');
}

export function canManagePortail(role: UserRole | undefined): boolean {
  return can(role, 'PORTAL_PUBLICATION_MANAGE');
}

export interface DocumentCapabilities {
  canUpload: boolean;
  canChangeCategory: boolean;
  canToggleInternalVisibility: boolean;
  canCorrectOcr: boolean;
  canRetryOcr: boolean;
  canTranslate: boolean;
  canManagePortal: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canOpen: boolean;
}

// Point d'entrée unique pour toute décision d'affichage/action liée à un
// document - évite de disperser des vérifications de capacité dans les
// colonnes, le panneau de détail et le menu d'actions. Les capacités liées
// à l'état du document (OCR/traduction) restent indépendantes du rôle une
// fois la capacité de base acquise.
export function getDocumentCapabilities(
  role: UserRole | undefined,
  doc: { statutOCR: string }
): DocumentCapabilities {
  return {
    canUpload: can(role, 'DOCUMENT_UPLOAD'),
    canChangeCategory: can(role, 'DOCUMENT_CATEGORY_MANAGE'),
    // PATCH /:id/visibilite-interne requires DOCUMENT_INTERNAL_VISIBILITY_MANAGE
    // server-side (documents.route.ts) — added as its own field during the
    // Phase 10.4 audit; the toggle previously read DOCUMENT_UPLOAD directly
    // via canManageDocuments() instead of a dedicated capability check.
    canToggleInternalVisibility: can(role, 'DOCUMENT_INTERNAL_VISIBILITY_MANAGE'),
    canCorrectOcr: can(role, 'DOCUMENT_OCR_MANAGE'),
    canRetryOcr:
      can(role, 'DOCUMENT_OCR_MANAGE') &&
      (doc.statutOCR === 'echec' || doc.statutOCR === 'a_retraiter'),
    // texteExtrait n'est plus renvoyé par le listing (voir documents.service.ts
    // côté serveur) : statutOCR === 'traite' implique déjà un texte extrait
    // non vide (seul cas où le serveur écrit ce statut), donc suffisant comme
    // condition d'éligibilité sans devoir charger le détail complet.
    // TRANSLATION_PROCESS (pas REQUEST_CREATE_OWN) - "Traduire" lance
    // directement une traduction opérationnelle, réservé operateur+ comme
    // aujourd'hui ; l'ouvrir à REQUEST_CREATE_OWN élargirait ce bouton aux
    // agents, ce qui n'est pas demandé ici.
    canTranslate: can(role, 'TRANSLATION_PROCESS') && doc.statutOCR === 'traite',
    canManagePortal: can(role, 'PORTAL_PUBLICATION_MANAGE'),
    canDelete: can(role, 'DOCUMENT_DELETE'),
    canDownload: true,
    canOpen: true,
  };
}
