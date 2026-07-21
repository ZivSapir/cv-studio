import type { CvVersion } from '../../types/cv';

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cv';
}

export function createUniqueIdFromLabel(
  label: string,
  existingIds: string[],
): string {
  const base = slugify(label);
  if (!existingIds.includes(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export function createUniqueSavedId(
  label: string,
  existingIds: string[],
): string {
  return createUniqueIdFromLabel(label, existingIds);
}

export function createUniqueBaseId(
  label: string,
  existingIds: string[],
): string {
  return createUniqueIdFromLabel(label, existingIds);
}

export function stripVersionForCopy(
  version: CvVersion,
): Omit<CvVersion, 'id' | 'label' | 'kind' | 'createdAt' | 'updatedAt'> {
  return {
    extends: 'master',
    notes: version.notes,
    headline: version.headline,
    summary: version.summary,
    hiddenBulletIds: version.hiddenBulletIds,
    hiddenProjectIds: version.hiddenProjectIds,
    bulletOverrides: version.bulletOverrides,
    projectOverrides: version.projectOverrides,
    experienceAdditions: version.experienceAdditions,
    experienceOrder: version.experienceOrder,
    experienceBulletOrder: version.experienceBulletOrder,
    projectOrder: version.projectOrder,
    skillCategoryOrder: version.skillCategoryOrder,
    skillOverrides: version.skillOverrides,
    roleTitleOverrides: version.roleTitleOverrides,
    projectsSectionTitle: version.projectsSectionTitle,
    footerNote: version.footerNote,
    education: version.education,
  };
}
