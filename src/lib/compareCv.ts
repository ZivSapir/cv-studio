import type { CvDiffEntry, CvExperience, CvVersion } from '../types/cv';

function formatList(values: string[] | undefined): string {
  if (!values?.length) {
    return '(default order)';
  }

  return values.join(', ');
}

function collectBulletIds(experience: CvExperience[]): string[] {
  return experience.flatMap((entry) =>
    entry.roles.flatMap((role) => role.bullets.map((bullet) => bullet.id)),
  );
}

function pushDiff(
  diffs: CvDiffEntry[],
  field: string,
  baseValue: string,
  compareValue: string,
): void {
  if (baseValue === compareValue) {
    return;
  }

  diffs.push({
    field,
    base: baseValue,
    compare: compareValue,
  });
}

export function compareCvVersions(
  baseVersion: CvVersion,
  compareVersion: CvVersion,
  baseExperience: CvExperience[],
  compareExperience: CvExperience[],
): CvDiffEntry[] {
  const diffs: CvDiffEntry[] = [];

  pushDiff(
    diffs,
    'Headline',
    baseVersion.headline ?? '(from master)',
    compareVersion.headline ?? '(from master)',
  );

  pushDiff(
    diffs,
    'Summary',
    baseVersion.summary ?? '(from master)',
    compareVersion.summary ?? '(from master)',
  );

  pushDiff(
    diffs,
    'Hidden bullets',
    formatList(baseVersion.hiddenBulletIds),
    formatList(compareVersion.hiddenBulletIds),
  );

  pushDiff(
    diffs,
    'Project order',
    formatList(baseVersion.projectOrder),
    formatList(compareVersion.projectOrder),
  );

  pushDiff(
    diffs,
    'Skill order',
    formatList(baseVersion.skillCategoryOrder),
    formatList(compareVersion.skillCategoryOrder),
  );

  pushDiff(
    diffs,
    'Visible experience bullets',
    formatList(collectBulletIds(baseExperience)),
    formatList(collectBulletIds(compareExperience)),
  );

  return diffs;
}
