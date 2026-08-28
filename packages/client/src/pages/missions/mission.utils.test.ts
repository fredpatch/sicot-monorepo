import { describe, it, expect } from 'vitest';
import { getMissionReportStatus } from './mission.utils';

const CURRENT_USER_ID = 42;
const OTHER_PARTICIPANT_ID = 7;

describe('getMissionReportStatus - single source of truth for MesMissionsPage and MyMissionsPanel', () => {
  it('reports "deposited" once rapportDocumentId is set, regardless of statut/responsible', () => {
    expect(
      getMissionReportStatus(
        { statut: 'terminee', rapportDocumentId: 99, rapportResponsableId: CURRENT_USER_ID },
        CURRENT_USER_ID
      )
    ).toBe('deposited');
  });

  it('reports "not-terminated" while the mission is not yet terminee, even for the designated responsible', () => {
    expect(
      getMissionReportStatus(
        { statut: 'en_cours', rapportDocumentId: undefined, rapportResponsableId: CURRENT_USER_ID },
        CURRENT_USER_ID
      )
    ).toBe('not-terminated');
  });

  it('the designated responsible participant gets "action-available" once terminee', () => {
    expect(
      getMissionReportStatus(
        {
          statut: 'terminee',
          rapportDocumentId: undefined,
          rapportResponsableId: CURRENT_USER_ID,
        },
        CURRENT_USER_ID
      )
    ).toBe('action-available');
  });

  it('another participant (not the designated responsible) gets a neutral waiting state, never the action', () => {
    expect(
      getMissionReportStatus(
        {
          statut: 'terminee',
          rapportDocumentId: undefined,
          rapportResponsableId: CURRENT_USER_ID,
        },
        OTHER_PARTICIPANT_ID
      )
    ).toBe('waiting-for-responsible');
  });

  it('no responsible designated yet gets a distinct neutral state, never the action', () => {
    expect(
      getMissionReportStatus(
        { statut: 'terminee', rapportDocumentId: undefined, rapportResponsableId: undefined },
        CURRENT_USER_ID
      )
    ).toBe('no-responsible');

    expect(
      getMissionReportStatus(
        { statut: 'terminee', rapportDocumentId: undefined, rapportResponsableId: undefined },
        undefined
      )
    ).toBe('no-responsible');
  });

  it('participantId undefined never resolves to "action-available", even if rapportResponsableId happens to be falsy-adjacent', () => {
    expect(
      getMissionReportStatus(
        { statut: 'terminee', rapportDocumentId: undefined, rapportResponsableId: 0 as unknown as number },
        undefined
      )
    ).not.toBe('action-available');
  });
});
