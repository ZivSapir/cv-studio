import { describe, expect, it } from 'vitest';
import {
  CvValidationError,
  validateCvBackup,
  validateCvMaster,
  validateCvVersion,
  validateCvVersionSafeFields,
} from './cvValidation';
import { makeMaster, makeVersion } from '../testUtils/cvFixtures';

describe('validateCvMaster', () => {
  it('accepts a well-formed master and returns it unchanged', () => {
    const master = makeMaster();
    expect(validateCvMaster(master)).toEqual(master);
  });

  it('rejects a non-object payload', () => {
    expect(() => validateCvMaster(null)).toThrow(CvValidationError);
    expect(() => validateCvMaster('yaml string')).toThrow(CvValidationError);
  });

  it('rejects a master missing required top-level fields', () => {
    const { name: _name, ...withoutName } = makeMaster();
    expect(() => validateCvMaster(withoutName)).toThrow(/"name"/);
  });

  it('rejects a master where experience is not an array (the crash this guards against)', () => {
    const master = { ...makeMaster(), experience: undefined };
    expect(() => validateCvMaster(master)).toThrow(/"experience"/);
  });

  it('rejects an experience entry with a malformed roles/bullets shape', () => {
    const master = makeMaster();
    master.experience[0]!.roles[0]!.bullets = [{ id: 'x' } as never];
    expect(() => validateCvMaster(master)).toThrow(/bullets\[0\]\.text/);
  });

  it('rejects a project missing a description', () => {
    const master = makeMaster();
    // @ts-expect-error deliberately malformed for the test
    delete master.projects[0].description;
    expect(() => validateCvMaster(master)).toThrow(/projects\[0\]\.description/);
  });

  it('rejects skills that are not an array', () => {
    const master = { ...makeMaster(), skills: { languages: 'TypeScript' } };
    expect(() => validateCvMaster(master)).toThrow(/"skills"/);
  });

  it('rejects education missing entries', () => {
    const master = { ...makeMaster(), education: { institution: 'X' } };
    expect(() => validateCvMaster(master)).toThrow(/education\.entries/);
  });
});

describe('validateCvVersionSafeFields', () => {
  it('accepts a version with no experienceAdditions/education', () => {
    const version = makeVersion();
    expect(validateCvVersionSafeFields(version)).toEqual(version);
  });

  it('does not require id/label (raw AI replies may omit them)', () => {
    expect(() => validateCvVersionSafeFields({})).not.toThrow();
  });

  it('rejects a malformed experienceAdditions entry', () => {
    const version = makeVersion({
      experienceAdditions: [{ id: 'thesis' } as never],
    });
    expect(() => validateCvVersionSafeFields(version)).toThrow(/experienceAdditions\[0\]\.company/);
  });

  it('rejects a malformed education override', () => {
    const version = makeVersion({ education: { institution: 'X' } as never });
    expect(() => validateCvVersionSafeFields(version)).toThrow(/education\.entries/);
  });
});

describe('validateCvVersion', () => {
  it('requires a non-empty id and a label', () => {
    expect(() => validateCvVersion({ label: 'No id' })).toThrow(/\.id/);
    expect(() => validateCvVersion({ id: '' })).toThrow(/\.id/);
  });

  it('accepts a well-formed version', () => {
    const version = makeVersion();
    expect(validateCvVersion(version)).toEqual(version);
  });
});

describe('validateCvBackup', () => {
  const validBackup = {
    version: 1 as const,
    exportedAt: '2024-01-01T00:00:00.000Z',
    master: makeMaster(),
    bases: [makeVersion({ id: 'main-cv', label: 'Main CV' })],
    saved: [makeVersion({ id: 'acme-role', label: 'Acme Role' })],
  };

  it('accepts a well-formed backup', () => {
    const result = validateCvBackup(validBackup);
    expect(result.master.name).toBe('Jordan Example');
    expect(result.bases).toHaveLength(1);
    expect(result.saved).toHaveLength(1);
  });

  it('defaults saved to an empty array when omitted', () => {
    const { saved: _saved, ...withoutSaved } = validBackup;
    const result = validateCvBackup(withoutSaved);
    expect(result.saved).toEqual([]);
  });

  it('rejects an unsupported version number', () => {
    expect(() => validateCvBackup({ ...validBackup, version: 2 })).toThrow(/version: 1/);
  });

  it('rejects a backup with a malformed master (the crash this guards against)', () => {
    expect(() =>
      validateCvBackup({ ...validBackup, master: { name: 'Only a name' } }),
    ).toThrow(CvValidationError);
  });

  it('rejects a backup where bases is not an array', () => {
    expect(() => validateCvBackup({ ...validBackup, bases: 'oops' })).toThrow(/"bases"/);
  });

  it('rejects a base version with an empty id', () => {
    expect(() =>
      validateCvBackup({ ...validBackup, bases: [{ id: '', label: 'X' }] }),
    ).toThrow(/bases\[0\]\.id/);
  });
});
