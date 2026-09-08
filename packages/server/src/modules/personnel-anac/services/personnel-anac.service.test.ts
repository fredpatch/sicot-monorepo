// Regression test: the Personnel ANAC API returns identity.matricule as a
// number, so a real matricule like "0230" arrives already indistinguishable
// from 230 - a leading zero cannot survive a number type. normaliser() must
// re-pad to the expected 4-digit matricule format when converting back to
// string, or accounts created/prefilled from this integration end up with a
// truncated matricule (e.g. "230" instead of "0230").
import { describe, it, expect, vi } from 'vitest';
import type { PersonnelAnacRaw } from '@/utils/personnel-anac';

const rechercherPersonnel = vi.fn();
const getPersonnelParMatricule = vi.fn();
const listerPersonnel = vi.fn();

vi.mock('@/utils/personnel-anac', () => ({
  rechercherPersonnel: (...args: unknown[]) => rechercherPersonnel(...args),
  getPersonnelParMatricule: (...args: unknown[]) => getPersonnelParMatricule(...args),
  listerPersonnel: (...args: unknown[]) => listerPersonnel(...args),
}));

function raw(matricule: number, overrides: Partial<PersonnelAnacRaw> = {}): PersonnelAnacRaw {
  return {
    id: 1,
    internalNumber: null,
    identity: { matricule, firstName: 'Jean', lastName: 'Dupont', gender: null },
    organization: { service: null, direction: null, function: null },
    ...overrides,
  };
}

describe('personnel-anac.service - matricule normalization', () => {
  it('rechercher() pads a leading-zero matricule back to 4 digits', async () => {
    const { rechercher } = await import('./personnel-anac.service');
    rechercherPersonnel.mockResolvedValueOnce([raw(230)]);

    const [result] = await rechercher('dupont');

    expect(result.matricule).toBe('0230');
  });

  it('getParMatricule() round-trips a leading-zero matricule correctly', async () => {
    const { getParMatricule } = await import('./personnel-anac.service');
    getPersonnelParMatricule.mockResolvedValueOnce(raw(230));

    const result = await getParMatricule('0230');

    // parseInt('0230', 10) === 230 - the external API is queried by number
    expect(getPersonnelParMatricule).toHaveBeenCalledWith(230);
    expect(result.matricule).toBe('0230');
  });

  it('lister() pads every row independently', async () => {
    const { lister } = await import('./personnel-anac.service');
    listerPersonnel.mockResolvedValueOnce({
      data: [raw(5), raw(1234), raw(45)],
      meta: { page: 1, limit: 20, total: 3 },
    });

    const { data } = await lister(1, 20, 'id', 'asc');

    expect(data.map((d) => d.matricule)).toEqual(['0005', '1234', '0045']);
  });

  it('does not truncate a matricule already at or above 4 digits', async () => {
    const { rechercher } = await import('./personnel-anac.service');
    rechercherPersonnel.mockResolvedValueOnce([raw(12345)]);

    const [result] = await rechercher('dupont');

    expect(result.matricule).toBe('12345');
  });
});
