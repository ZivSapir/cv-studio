import { describe, expect, it } from 'vitest';
import { toGeneratedTailoredCv } from './generateTailoredCv';
import { makeMaster } from '../../testUtils/cvFixtures';

describe('toGeneratedTailoredCv', () => {
  it('throws if the reply is missing id or label', () => {
    const master = makeMaster();
    expect(() => toGeneratedTailoredCv({ label: 'Only a label' }, master)).toThrow(/id or label/);
    expect(() => toGeneratedTailoredCv({ id: 'only-id' }, master)).toThrow(/id or label/);
  });

  it('keeps ids that exist in master', () => {
    const master = makeMaster();
    const result = toGeneratedTailoredCv(
      {
        id: 'acme-role',
        label: 'Acme Role',
        hiddenBulletIds: ['acme-quality'],
        hiddenProjectIds: ['project-alpha'],
      },
      master,
    );

    expect(result.hiddenBulletIds).toEqual(['acme-quality']);
    expect(result.hiddenProjectIds).toEqual(['project-alpha']);
  });

  it('drops hallucinated ids that do not exist in master (defense-in-depth beyond the schema enum)', () => {
    const master = makeMaster();
    const result = toGeneratedTailoredCv(
      {
        id: 'acme-role',
        label: 'Acme Role',
        hiddenBulletIds: ['acme-quality', 'made-up-bullet'],
        hiddenProjectIds: ['made-up-project'],
      },
      master,
    );

    expect(result.hiddenBulletIds).toEqual(['acme-quality']);
    expect(result.hiddenProjectIds).toBeUndefined();
  });

  it('drops bulletOverrides referencing an unknown bulletId', () => {
    const master = makeMaster();
    const result = toGeneratedTailoredCv(
      {
        id: 'acme-role',
        label: 'Acme Role',
        bulletOverrides: [
          { bulletId: 'acme-feature', text: 'Rewritten.' },
          { bulletId: 'invented-id', text: 'Should be dropped.' },
        ],
      },
      master,
    );

    expect(result.bulletOverrides).toEqual({ 'acme-feature': 'Rewritten.' });
  });

  it('drops experienceBulletOrder entries for unknown experience/bullet ids', () => {
    const master = makeMaster();
    const result = toGeneratedTailoredCv(
      {
        id: 'acme-role',
        label: 'Acme Role',
        experienceBulletOrder: [
          { experienceId: 'acme', bulletIds: ['acme-quality', 'acme-feature', 'invented'] },
          { experienceId: 'invented-experience', bulletIds: ['acme-feature'] },
        ],
      },
      master,
    );

    expect(result.experienceBulletOrder).toEqual({ acme: ['acme-quality', 'acme-feature'] });
  });

  it('omits fields entirely rather than returning empty arrays/objects', () => {
    const master = makeMaster();
    const result = toGeneratedTailoredCv(
      { id: 'acme-role', label: 'Acme Role', hiddenBulletIds: ['invented-only'] },
      master,
    );

    expect(result.hiddenBulletIds).toBeUndefined();
  });
});
