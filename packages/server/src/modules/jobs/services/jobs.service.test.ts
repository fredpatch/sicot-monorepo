import { describe, it, expect, vi, beforeEach } from 'vitest';

// Per-job execution restriction, tested independently of route access
// (prompt.md Phase 4.8.3 explicitly asks for this separation): route-level
// JOB_EXECUTE is covered in jobs.route.test.ts; this file exercises
// executerJobManuel() directly against fake job definitions to prove the
// SYSTEM_ADMIN_OPERATION tier for high-risk jobs (backups/system), with the
// DB/audit/registry layers mocked out.
const getJobParCle = vi.fn();
vi.mock('@/jobs/registre.js', () => ({
  REGISTRE_JOBS: [],
  getJobParCle: (...args: unknown[]) => getJobParCle(...args),
}));

vi.mock('@/modules/auth/services/auth.service.js', () => ({
  logAudit: vi.fn(),
}));

vi.mock('./job-executions.service.js', () => ({
  enregistrerExecutionJob: vi.fn(),
  listerExecutionsJobs: vi.fn(),
}));

const { executerJobManuel } = await import('./jobs.service');

const jobOrdinaire = {
  cle: 'ordinaire',
  label: 'Job ordinaire',
  description: '',
  module: 'M1',
  executionCapability: 'JOB_EXECUTE' as const,
  executer: vi.fn().mockResolvedValue({ resume: 'ok' }),
};

const jobHautRisque = {
  cle: 'backup_x',
  label: 'Sauvegarde',
  description: '',
  module: 'M10',
  executionCapability: 'SYSTEM_ADMIN_OPERATION' as const,
  executer: vi.fn().mockResolvedValue({ resume: 'ok' }),
};

beforeEach(() => {
  getJobParCle.mockReset();
  jobOrdinaire.executer.mockClear();
  jobHautRisque.executer.mockClear();
});

describe('executerJobManuel - per-job SYSTEM_ADMIN_OPERATION restriction', () => {
  it('throws JOB_INTROUVABLE for an unknown key', async () => {
    getJobParCle.mockReturnValue(undefined);
    await expect(executerJobManuel('nope', 1, 'admin')).rejects.toThrow('JOB_INTROUVABLE');
  });

  it.each(['admin', 'super_admin'])(
    'role=%s can run an ordinary job (has JOB_EXECUTE)',
    async (role) => {
      getJobParCle.mockReturnValue(jobOrdinaire);
      const result = await executerJobManuel('ordinaire', 1, role);
      expect(result.succes).toBe(true);
      expect(jobOrdinaire.executer).toHaveBeenCalledOnce();
    }
  );

  it.each(['operateur'])(
    'role=%s is rejected even on an ordinary job when calling the service directly (no JOB_EXECUTE) - ' +
      'authorization is now direct on the capability, not solely reliant on the route gate',
    async (role) => {
      getJobParCle.mockReturnValue(jobOrdinaire);
      await expect(executerJobManuel('ordinaire', 1, role)).rejects.toThrow('ROLE_INSUFFISANT');
      expect(jobOrdinaire.executer).not.toHaveBeenCalled();
    }
  );

  it.each(['admin', 'operateur'])(
    'role=%s is rejected on a high-risk job (no SYSTEM_ADMIN_OPERATION) - route access alone is not enough',
    async (role) => {
      getJobParCle.mockReturnValue(jobHautRisque);
      await expect(executerJobManuel('backup_x', 1, role)).rejects.toThrow('ROLE_INSUFFISANT');
      expect(jobHautRisque.executer).not.toHaveBeenCalled();
    }
  );

  it('super_admin can run a high-risk job (has SYSTEM_ADMIN_OPERATION)', async () => {
    getJobParCle.mockReturnValue(jobHautRisque);
    const result = await executerJobManuel('backup_x', 1, 'super_admin');
    expect(result.succes).toBe(true);
    expect(jobHautRisque.executer).toHaveBeenCalledOnce();
  });

  it('super_admin can also run an ordinary job', async () => {
    getJobParCle.mockReturnValue(jobOrdinaire);
    const result = await executerJobManuel('ordinaire', 1, 'super_admin');
    expect(result.succes).toBe(true);
  });
});
