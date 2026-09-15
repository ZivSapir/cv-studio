import { describe, expect, it } from 'vitest';
import { compareResolvedCvs } from './compareCv';
import { mergeCvVersion } from './mergeCvVersion';
import { makeMaster, makeVersion } from '../testUtils/cvFixtures';

describe('compareResolvedCvs', () => {
  it('returns no sections when the two CVs are identical', () => {
    const master = makeMaster();
    const base = mergeCvVersion(master, makeVersion());
    const same = mergeCvVersion(master, makeVersion());

    expect(compareResolvedCvs(base, same)).toEqual([]);
  });

  it('reports a headline change', () => {
    const master = makeMaster();
    const base = mergeCvVersion(master, makeVersion());
    const changed = mergeCvVersion(master, makeVersion({ headline: 'Staff Engineer' }));

    const diffs = compareResolvedCvs(base, changed);
    const headlineSection = diffs.find((section) => section.field === 'Headline');

    expect(headlineSection).toBeDefined();
    expect(headlineSection?.lines.some((line) => line.type === 'add' && line.content.includes('Staff Engineer'))).toBe(true);
  });

  it('reports removed and added bullets separately from edited ones', () => {
    const master = makeMaster();
    const base = mergeCvVersion(master, makeVersion());
    const compare = mergeCvVersion(
      master,
      makeVersion({ hiddenBulletIds: ['acme-quality'], bulletOverrides: { 'acme-feature': 'Different wording.' } }),
    );

    const diffs = compareResolvedCvs(base, compare);
    const removedSection = diffs.find((section) => section.field === 'Experience - removed bullets');
    const editedSection = diffs.find((section) => section.field === 'Experience - edited bullets');

    expect(removedSection?.lines[0]?.content).toContain('Wrote the tests.');
    expect(editedSection?.lines.some((line) => line.type === 'add' && line.content.includes('Different wording.'))).toBe(true);
  });

  it('reports project title/description changes under a per-project field', () => {
    const master = makeMaster();
    const base = mergeCvVersion(master, makeVersion());
    const compare = mergeCvVersion(
      master,
      makeVersion({ projectOverrides: { 'project-alpha': { description: 'A rewritten description.' } } }),
    );

    const diffs = compareResolvedCvs(base, compare);
    expect(diffs.some((section) => section.field.startsWith('Projects - '))).toBe(true);
  });

  it('reports skill category changes', () => {
    const master = makeMaster();
    const base = mergeCvVersion(master, makeVersion());
    const compare = mergeCvVersion(
      master,
      makeVersion({ skillOverrides: { languages: { items: 'Rust only' } } }),
    );

    const diffs = compareResolvedCvs(base, compare);
    expect(diffs.some((section) => section.field.startsWith('Skills - '))).toBe(true);
  });
});
