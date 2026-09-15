import { describe, expect, it } from 'vitest';
import { mergeCvVersion } from './mergeCvVersion';
import { makeMaster, makeVersion } from '../testUtils/cvFixtures';

describe('mergeCvVersion', () => {
  it('falls back to master headline/summary/education when the version overrides nothing', () => {
    const master = makeMaster();
    const resolved = mergeCvVersion(master, makeVersion());

    expect(resolved.headline).toBe(master.headline);
    expect(resolved.summary).toBe(master.summary);
    expect(resolved.education).toEqual(master.education);
    expect(resolved.projectsSectionTitle).toBe('Personal Projects');
  });

  it('applies version overrides for headline/summary/education', () => {
    const master = makeMaster();
    const resolved = mergeCvVersion(
      master,
      makeVersion({
        headline: 'Staff Engineer',
        summary: 'Tailored summary.',
        education: { institution: 'Other Uni', entries: [] },
      }),
    );

    expect(resolved.headline).toBe('Staff Engineer');
    expect(resolved.summary).toBe('Tailored summary.');
    expect(resolved.education.institution).toBe('Other Uni');
  });

  it('hides bullets and projects by id', () => {
    const master = makeMaster();
    const resolved = mergeCvVersion(
      master,
      makeVersion({
        hiddenBulletIds: ['acme-quality'],
        hiddenProjectIds: ['project-alpha'],
      }),
    );

    const bulletIds = resolved.experience[0]!.roles[0]!.bullets.map((b) => b.id);
    expect(bulletIds).toEqual(['acme-feature']);
    expect(resolved.projects).toHaveLength(0);
  });

  it('applies bullet and project text overrides without touching master', () => {
    const master = makeMaster();
    const resolved = mergeCvVersion(
      master,
      makeVersion({
        bulletOverrides: { 'acme-feature': 'Rewritten bullet.' },
        projectOverrides: { 'project-alpha': { title: 'Renamed Project' } },
      }),
    );

    const bullet = resolved.experience[0]!.roles[0]!.bullets.find((b) => b.id === 'acme-feature');
    expect(bullet?.text).toBe('Rewritten bullet.');
    expect(resolved.projects[0]?.title).toBe('Renamed Project');
    expect(master.experience[0]!.roles[0]!.bullets[0]!.text).toBe('Shipped the feature.');
  });

  it('reorders bullets, projects, and skill categories by the given id order', () => {
    const master = makeMaster({
      projects: [
        { id: 'project-alpha', title: 'Alpha', description: 'A.' },
        { id: 'project-beta', title: 'Beta', description: 'B.' },
      ],
    });
    const resolved = mergeCvVersion(
      master,
      makeVersion({
        experienceBulletOrder: { acme: ['acme-quality', 'acme-feature'] },
        projectOrder: ['project-beta', 'project-alpha'],
      }),
    );

    const bulletIds = resolved.experience[0]!.roles[0]!.bullets.map((b) => b.id);
    expect(bulletIds).toEqual(['acme-quality', 'acme-feature']);
    expect(resolved.projects.map((p) => p.id)).toEqual(['project-beta', 'project-alpha']);
  });

  it('appends experienceAdditions after master experience, ordered by experienceOrder', () => {
    const master = makeMaster();
    const resolved = mergeCvVersion(
      master,
      makeVersion({
        experienceAdditions: [
          {
            id: 'side-gig',
            company: 'Side Gig',
            location: 'Remote',
            tenure: '2019',
            roles: [{ title: 'Freelancer', bullets: [{ id: 'side-1', text: 'Did a thing.' }] }],
          },
        ],
        experienceOrder: ['side-gig', 'acme'],
      }),
    );

    expect(resolved.experience.map((e) => e.id)).toEqual(['side-gig', 'acme']);
  });

  it('applies skill overrides by category id without mutating master', () => {
    const master = makeMaster();
    const resolved = mergeCvVersion(
      master,
      makeVersion({
        skillOverrides: { languages: { items: 'TypeScript only' } },
      }),
    );

    expect(resolved.skills[0]?.items).toBe('TypeScript only');
    expect(master.skills[0]!.items).toBe('TypeScript, Python');
  });
});
