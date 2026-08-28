import { describe, it, expect } from 'vitest';
import { canValidateAnalyticsReport } from './analytics.permissions';

describe('canValidateAnalyticsReport - ADMIN_MONITORING_VIEW, mirrors the PATCH .../analyse-ia gate', () => {
  it('admin+ can validate (ADMIN_MONITORING_VIEW is bundled with ANALYTICS_VIEW at the admin tier today)', () => {
    expect(canValidateAnalyticsReport('admin')).toBe(true);
    expect(canValidateAnalyticsReport('super_admin')).toBe(true);
  });

  it('operateur cannot validate (also lacks ANALYTICS_VIEW, so never reaches /analytics)', () => {
    expect(canValidateAnalyticsReport('operateur')).toBe(false);
  });

  it('agent cannot validate', () => {
    expect(canValidateAnalyticsReport('agent')).toBe(false);
  });

  it('undefined role denies', () => {
    expect(canValidateAnalyticsReport(undefined)).toBe(false);
  });
});
