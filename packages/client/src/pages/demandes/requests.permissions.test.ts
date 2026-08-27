import { describe, it, expect } from 'vitest';
import {
  canTakeRequest,
  canRecallRequest,
  canSubmitForReview,
  canValidatePriority,
  canValidateRequest,
  canArchiveRequest,
  canOpenTranslation,
  getRequestPrimaryAction,
} from './requests.permissions';
import type { Demande } from './requests.types';

// Pure-function unit tests for the client-side action matrix (Phase 5.3) —
// verifies it mirrors the server's capability + contextual-ownership shape
// (demandes.controller.ts/demandes.service.ts, Phase 4.5) without
// duplicating server security logic: these gate button visibility only.
function demande(overrides: Partial<Demande> = {}): Demande {
  return {
    id: 1,
    demandeurId: 42,
    direction: 'fr_en',
    prioriteDemandee: 'normale',
    statut: 'soumise',
    verrou: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function user(role: string, id = 1) {
  return { id, role: role as never };
}

describe('canTakeRequest — REQUEST_TAKE, agent excluded', () => {
  it('agent cannot take, even an available request', () => {
    expect(canTakeRequest(demande({ statut: 'soumise' }), user('agent'))).toBe(false);
  });

  it('operateur can take an available (unlocked, soumise) request', () => {
    expect(canTakeRequest(demande({ statut: 'soumise', verrou: false }), user('operateur'))).toBe(true);
  });

  it('locked or non-soumise requests cannot be taken even by operateur', () => {
    expect(canTakeRequest(demande({ statut: 'soumise', verrou: true }), user('operateur'))).toBe(false);
    expect(canTakeRequest(demande({ statut: 'en_cours' }), user('operateur'))).toBe(false);
  });
});

describe('canRecallRequest — requester ownership, not role-derived', () => {
  it('the owning requester can recall their own soumise request, any role', () => {
    expect(canRecallRequest(demande({ statut: 'soumise', demandeurId: 42 }), user('agent', 42))).toBe(true);
    expect(canRecallRequest(demande({ statut: 'soumise', demandeurId: 42 }), user('admin', 42))).toBe(true);
  });

  it('another user cannot recall someone else\'s request', () => {
    expect(canRecallRequest(demande({ statut: 'soumise', demandeurId: 42 }), user('agent', 99))).toBe(false);
  });

  it('cannot recall once no longer soumise, even the owner', () => {
    expect(canRecallRequest(demande({ statut: 'en_cours', demandeurId: 42 }), user('agent', 42))).toBe(false);
  });
});

describe('canSubmitForReview — assigned-translator ownership + REQUEST_SUBMIT_REVIEW', () => {
  it('the assigned translator can submit their own en_cours request', () => {
    expect(
      canSubmitForReview(demande({ statut: 'en_cours', traducteurId: 7 }), user('operateur', 7))
    ).toBe(true);
  });

  it('a different operateur (not assigned) cannot submit it', () => {
    expect(
      canSubmitForReview(demande({ statut: 'en_cours', traducteurId: 7 }), user('operateur', 8))
    ).toBe(false);
  });

  it('agent lacks REQUEST_SUBMIT_REVIEW even if somehow assigned', () => {
    expect(
      canSubmitForReview(demande({ statut: 'en_cours', traducteurId: 42 }), user('agent', 42))
    ).toBe(false);
  });
});

describe('canValidatePriority / canValidateRequest / canArchiveRequest — capability + workflow state', () => {
  it('operateur can validate priority unless archived', () => {
    expect(canValidatePriority(demande({ statut: 'en_cours' }), user('operateur'))).toBe(true);
    expect(canValidatePriority(demande({ statut: 'archivee' }), user('operateur'))).toBe(false);
  });

  it('agent cannot validate priority regardless of state', () => {
    expect(canValidatePriority(demande({ statut: 'en_cours' }), user('agent'))).toBe(false);
  });

  it('validate requires en_relecture + REQUEST_VALIDATE', () => {
    expect(canValidateRequest(demande({ statut: 'en_relecture' }), user('operateur'))).toBe(true);
    expect(canValidateRequest(demande({ statut: 'en_cours' }), user('operateur'))).toBe(false);
    expect(canValidateRequest(demande({ statut: 'en_relecture' }), user('agent'))).toBe(false);
  });

  it('archive requires validee + REQUEST_ARCHIVE', () => {
    expect(canArchiveRequest(demande({ statut: 'validee' }), user('operateur'))).toBe(true);
    expect(canArchiveRequest(demande({ statut: 'en_relecture' }), user('operateur'))).toBe(false);
    expect(canArchiveRequest(demande({ statut: 'validee' }), user('agent'))).toBe(false);
  });
});

describe('canOpenTranslation — matches the /traductions/:id route guard (TRANSLATION_VIEW)', () => {
  it('operateur+ can open a linked translation', () => {
    expect(canOpenTranslation(demande({ traductionId: 5 }), user('operateur'))).toBe(true);
  });

  it('agent cannot (workshop is not a safe read-only view yet)', () => {
    expect(canOpenTranslation(demande({ traductionId: 5 }), user('agent'))).toBe(false);
  });

  it('no linked translation means nothing to open, even for operateur', () => {
    expect(canOpenTranslation(demande({ traductionId: undefined }), user('operateur'))).toBe(false);
  });
});

describe('getRequestPrimaryAction — single most relevant action', () => {
  it('prefers "take" over other actions when available', () => {
    expect(getRequestPrimaryAction(demande({ statut: 'soumise' }), user('operateur'))).toBe(
      'prendre_en_charge'
    );
  });

  it('falls back to opening the translation when nothing else applies', () => {
    expect(
      getRequestPrimaryAction(demande({ statut: 'archivee', traductionId: 5 }), user('operateur'))
    ).toBe('ouvrir_traduction');
  });

  it('returns null when the user has no relevant action', () => {
    expect(getRequestPrimaryAction(demande({ statut: 'archivee' }), user('agent'))).toBeNull();
  });
});
