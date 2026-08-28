import { describe, it, expect } from 'vitest';
import { canManageGlossaire } from './glossary.permissions';

describe('canManageGlossaire - GLOSSARY_MANAGE, mirrors glossaire.route.ts mutation gate', () => {
  it('operateur+ can manage (GLOSSARY_MANAGE is bundled with GLOSSARY_VIEW at the operateur tier today)', () => {
    expect(canManageGlossaire('operateur')).toBe(true);
    expect(canManageGlossaire('admin')).toBe(true);
    expect(canManageGlossaire('super_admin')).toBe(true);
  });

  it('agent cannot manage (also lacks GLOSSARY_VIEW, so never reaches /glossaire)', () => {
    expect(canManageGlossaire('agent')).toBe(false);
  });

  it('undefined role denies', () => {
    expect(canManageGlossaire(undefined)).toBe(false);
  });
});
