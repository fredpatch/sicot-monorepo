import { describe, it, expect } from 'vitest';
import { canManageDocuments, canManagePortail, getDocumentCapabilities } from './documents.permissions';

describe('canManageDocuments — DOCUMENT_UPLOAD, agent excluded', () => {
  it('agent cannot manage the general document library', () => {
    expect(canManageDocuments('agent')).toBe(false);
  });

  it('operateur+ can', () => {
    expect(canManageDocuments('operateur')).toBe(true);
    expect(canManageDocuments('admin')).toBe(true);
  });

  it('undefined role denies', () => {
    expect(canManageDocuments(undefined)).toBe(false);
  });
});

describe('canManagePortail — PORTAL_PUBLICATION_MANAGE, admin+ only', () => {
  it('operateur cannot manage portal publication', () => {
    expect(canManagePortail('operateur')).toBe(false);
  });

  it('admin/super_admin can', () => {
    expect(canManagePortail('admin')).toBe(true);
    expect(canManagePortail('super_admin')).toBe(true);
  });
});

describe('getDocumentCapabilities — per-action capability, not one shared role tier', () => {
  it('agent gets no management capabilities, only download/open', () => {
    const cap = getDocumentCapabilities('agent', { statutOCR: 'traite' });
    expect(cap).toMatchObject({
      canUpload: false,
      canChangeCategory: false,
      canCorrectOcr: false,
      canRetryOcr: false,
      canTranslate: false,
      canManagePortal: false,
      canDelete: false,
      canDownload: true,
      canOpen: true,
    });
  });

  it('operateur gets the full document management set', () => {
    const cap = getDocumentCapabilities('operateur', { statutOCR: 'traite' });
    expect(cap.canUpload).toBe(true);
    expect(cap.canChangeCategory).toBe(true);
    expect(cap.canCorrectOcr).toBe(true);
    expect(cap.canDelete).toBe(true);
    expect(cap.canTranslate).toBe(true);
    // still not admin-only:
    expect(cap.canManagePortal).toBe(false);
  });

  it('canRetryOcr only when OCR failed or needs reprocessing', () => {
    expect(getDocumentCapabilities('operateur', { statutOCR: 'traite' }).canRetryOcr).toBe(false);
    expect(getDocumentCapabilities('operateur', { statutOCR: 'echec' }).canRetryOcr).toBe(true);
    expect(getDocumentCapabilities('operateur', { statutOCR: 'a_retraiter' }).canRetryOcr).toBe(true);
  });

  it('canTranslate requires statutOCR traite even for operateur', () => {
    expect(getDocumentCapabilities('operateur', { statutOCR: 'en_attente' }).canTranslate).toBe(false);
  });

  it('admin/super_admin additionally get canManagePortal', () => {
    expect(getDocumentCapabilities('admin', { statutOCR: 'traite' }).canManagePortal).toBe(true);
    expect(getDocumentCapabilities('super_admin', { statutOCR: 'traite' }).canManagePortal).toBe(true);
  });
});
