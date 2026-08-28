import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@/middleware/auth';
import jobsRouter from './jobs.route';

// Confirms the Phase 4.8.3 contract cleanup end to end: the real GET /jobs
// response (no controller/service mocking - listerJobs() is a pure
// synchronous read of the registry, no DB involved) carries capability
// terminology and has fully dropped roleMinimum. Real registry, real
// controller, real service - only JWT verification is stubbed.
vi.mock('@/utils/jwt', () => ({
  verifyAccessToken: (token: string) => JSON.parse(token),
}));

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use('/jobs', jobsRouter);
  return app;
}

function cookieFor(role: string) {
  const token = JSON.stringify({ userId: 1, matricule: 'X0001', role });
  return `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`;
}

describe('GET /jobs - API metadata contract', () => {
  it('every job carries executionCapability and never roleMinimum', async () => {
    const app = buildApp();
    const res = await request(app).get('/jobs').set('Cookie', cookieFor('admin')).expect(200);

    const jobs = res.body as Array<Record<string, unknown>>;
    expect(jobs.length).toBeGreaterThan(0);

    for (const job of jobs) {
      expect(job).toHaveProperty('executionCapability');
      expect(['JOB_EXECUTE', 'SYSTEM_ADMIN_OPERATION']).toContain(job.executionCapability);
      expect(job).not.toHaveProperty('roleMinimum');
    }
  });

  it('backup/system jobs are SYSTEM_ADMIN_OPERATION, everything else is JOB_EXECUTE', async () => {
    const app = buildApp();
    const res = await request(app).get('/jobs').set('Cookie', cookieFor('admin')).expect(200);
    const jobs = res.body as Array<{ cle: string; executionCapability: string }>;

    const backupJobs = jobs.filter((j) => j.cle.startsWith('backup_'));
    expect(backupJobs.length).toBeGreaterThan(0);
    for (const job of backupJobs) {
      expect(job.executionCapability).toBe('SYSTEM_ADMIN_OPERATION');
    }

    const ordinaryJobs = jobs.filter((j) => !j.cle.startsWith('backup_'));
    expect(ordinaryJobs.length).toBeGreaterThan(0);
    for (const job of ordinaryJobs) {
      expect(job.executionCapability).toBe('JOB_EXECUTE');
    }
  });
});
