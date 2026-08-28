import { describe, it, expect } from 'vitest';
import { validerResponsableRapport } from './missions.service';
import { toMissionView } from './missions.helpers';

// Phase 8 - pure-function unit tests for the mission-report-responsibility
// domain rule (rapportResponsableId must always name a current participant).
// No DB: consistent with the rest of this codebase's test strategy (HTTP
// route tests mock the whole service layer; genuinely pure logic gets a
// direct unit test instead of introducing a new DB-mocking pattern).
describe('validerResponsableRapport - assigning a participant as report responsible', () => {
  it('accepts a candidate who is in the participant list', () => {
    expect(() => validerResponsableRapport(7, [7, 8, 9])).not.toThrow();
  });

  it('accepts null (clearing/leaving no responsible) regardless of the participant list', () => {
    expect(() => validerResponsableRapport(null, [])).not.toThrow();
    expect(() => validerResponsableRapport(null, [7, 8])).not.toThrow();
  });
});

describe('validerResponsableRapport - rejecting a non-participant', () => {
  it('rejects a candidate not in the participant list', () => {
    expect(() => validerResponsableRapport(99, [7, 8, 9])).toThrow(
      'RESPONSABLE_RAPPORT_NON_PARTICIPANT'
    );
  });

  it('rejects any candidate when the mission has no participants', () => {
    expect(() => validerResponsableRapport(1, [])).toThrow('RESPONSABLE_RAPPORT_NON_PARTICIPANT');
  });
});

describe('toMissionView - a mission with a report but no responsible remains valid', () => {
  function baseMission(overrides: Partial<Parameters<typeof toMissionView>[0]> = {}) {
    return {
      id: 1,
      titre: 'Mission test',
      destination: 'Libreville',
      pays: 'Gabon',
      dateDebut: new Date('2026-01-01'),
      dateFin: new Date('2026-01-05'),
      statut: 'terminee',
      rapportDocumentId: 42,
      rapportResponsableId: null,
      createdPar: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      confirmationLogistique: 'confirme',
      logistiqueBilletReserve: true,
      logistiqueHebergementConfirme: true,
      logistiqueFinancementValide: true,
      contactSurPlaceId: null,
      ...overrides,
    } as Parameters<typeof toMissionView>[0];
  }

  it('a legacy mission (rapportDocumentId set, rapportResponsableId never set / null) is readable', () => {
    const view = toMissionView(baseMission(), []);
    expect(view.rapportDocumentId).toBe(42);
    expect(view.rapportResponsableId).toBeUndefined();
  });

  it('a mission with a designated responsible surfaces it', () => {
    const view = toMissionView(baseMission({ rapportResponsableId: 7 }), []);
    expect(view.rapportResponsableId).toBe(7);
  });

  it('a mission has exactly one official report field - no per-participant report list exists on the view', () => {
    const view = toMissionView(baseMission(), []);
    expect(typeof view.rapportDocumentId).toBe('number');
    expect(view).not.toHaveProperty('rapports');
    expect(view).not.toHaveProperty('rapportDocumentIds');
  });
});
