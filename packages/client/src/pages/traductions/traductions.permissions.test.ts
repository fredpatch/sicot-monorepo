// packages/client/src/pages/traductions/traductions.permissions.test.ts
import { describe, it, expect } from 'vitest';
import { canSaveCorrection, canApproveTraduction, canArchiveTraduction } from './traductions.permissions';
import type { Traduction } from './traductions.types';

function traduction(overrides: Partial<Traduction> = {}): Traduction {
  return {
    id: 1,
    direction: 'fr_en',
    statut: 'a_reviser',
    moteurUtilise: 'libretranslate',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function user(role: string) {
  return { role: role as never };
}

describe('canSaveCorrection — TRANSLATION_PROCESS AND a modifiable status', () => {
  it('operateur+ can save while a_reviser/en_relecture/manuelle_requise', () => {
    for (const statut of ['a_reviser', 'en_relecture', 'manuelle_requise'] as const) {
      expect(canSaveCorrection(traduction({ statut }), user('operateur'))).toBe(true);
    }
  });

  it('cannot save once approuvee or archivee, even operateur+', () => {
    expect(canSaveCorrection(traduction({ statut: 'approuvee' }), user('operateur'))).toBe(false);
    expect(canSaveCorrection(traduction({ statut: 'archivee' }), user('operateur'))).toBe(false);
  });

  it('agent lacks TRANSLATION_PROCESS regardless of status', () => {
    expect(canSaveCorrection(traduction({ statut: 'a_reviser' }), user('agent'))).toBe(false);
  });

  it('no user denies', () => {
    expect(canSaveCorrection(traduction({ statut: 'a_reviser' }), undefined)).toBe(false);
  });
});

describe('canApproveTraduction — TRANSLATION_REVIEW + TRANSLATION_APPROVE (both), mirrors requireAllCapabilities server-side', () => {
  it('operateur+ (holds both) can approve while in a modifiable status', () => {
    expect(canApproveTraduction(traduction({ statut: 'en_relecture' }), user('operateur'))).toBe(true);
    expect(canApproveTraduction(traduction({ statut: 'manuelle_requise' }), user('admin'))).toBe(true);
  });

  it('cannot approve once already approuvee or archivee', () => {
    expect(canApproveTraduction(traduction({ statut: 'approuvee' }), user('operateur'))).toBe(false);
    expect(canApproveTraduction(traduction({ statut: 'archivee' }), user('operateur'))).toBe(false);
  });

  it('agent lacks both capabilities', () => {
    expect(canApproveTraduction(traduction({ statut: 'en_relecture' }), user('agent'))).toBe(false);
  });

  it('does not encode a separation-of-duties rule — the same capable user may approve without a second processor', () => {
    // No ownership/traducteurId check at all: any operateur+ can approve
    // any translation they can see, including one they just corrected.
    const t = traduction({ statut: 'en_relecture', traducteurId: 42 });
    expect(canApproveTraduction(t, user('operateur'))).toBe(true);
  });
});

describe('canArchiveTraduction — TRANSLATION_ARCHIVE AND already approuvee', () => {
  it('operateur+ can archive once approuvee', () => {
    expect(canArchiveTraduction(traduction({ statut: 'approuvee' }), user('operateur'))).toBe(true);
  });

  it('cannot archive before approval', () => {
    expect(canArchiveTraduction(traduction({ statut: 'en_relecture' }), user('operateur'))).toBe(false);
  });

  it('cannot archive an already-archived translation', () => {
    expect(canArchiveTraduction(traduction({ statut: 'archivee' }), user('operateur'))).toBe(false);
  });

  it('agent lacks TRANSLATION_ARCHIVE', () => {
    expect(canArchiveTraduction(traduction({ statut: 'approuvee' }), user('agent'))).toBe(false);
  });
});
