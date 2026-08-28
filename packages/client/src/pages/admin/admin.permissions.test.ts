import { describe, it, expect } from 'vitest';
import { canEditParameter, canRunJob } from './admin.permissions';
import type { JobDisponible } from './admin.types';

function job(executionCapability: JobDisponible['executionCapability']): JobDisponible {
  return { cle: 'x', label: 'X', description: '', module: 'M1', executionCapability };
}

describe('canEditParameter - SYSTEM_SETTINGS_MANAGE, super_admin only through capability mapping', () => {
  it('admin cannot edit parameters (SYSTEM_SETTINGS_MANAGE absent from ADMIN_CAPABILITIES)', () => {
    expect(canEditParameter('admin')).toBe(false);
  });

  it('super_admin can', () => {
    expect(canEditParameter('super_admin')).toBe(true);
  });

  it('undefined denies', () => {
    expect(canEditParameter(undefined)).toBe(false);
  });
});

describe("canRunJob - derived directly from the job's own executionCapability", () => {
  it('ordinary job (JOB_EXECUTE): admin+ allowed, agent/operateur denied', () => {
    const ordinaire = job('JOB_EXECUTE');
    expect(canRunJob('admin', ordinaire)).toBe(true);
    expect(canRunJob('super_admin', ordinaire)).toBe(true);
    expect(canRunJob('agent', ordinaire)).toBe(false);
    expect(canRunJob('operateur', ordinaire)).toBe(false);
  });

  it('high-risk job (SYSTEM_ADMIN_OPERATION): super_admin only, admin denied', () => {
    const hautRisque = job('SYSTEM_ADMIN_OPERATION');
    expect(canRunJob('super_admin', hautRisque)).toBe(true);
    expect(canRunJob('admin', hautRisque)).toBe(false);
  });

  it('undefined role denies regardless of job', () => {
    expect(canRunJob(undefined, job('JOB_EXECUTE'))).toBe(false);
  });
});
