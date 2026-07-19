import type {
  CvExperience,
  CvMaster,
  CvVersion,
  ResolvedCv,
} from '../types/cv';

function orderByIds<T extends { id: string }>(
  items: T[],
  order: string[] | undefined,
): T[] {
  if (!order?.length) {
    return items;
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((item): item is T => item !== undefined);

  const orderedIds = new Set(ordered.map((item) => item.id));
  const remainder = items.filter((item) => !orderedIds.has(item.id));

  return [...ordered, ...remainder];
}

function filterExperience(
  experience: CvExperience[],
  hiddenBulletIds: Set<string>,
  bulletOrderByExperience: Record<string, string[]> | undefined,
): CvExperience[] {
  return experience.map((entry) => ({
    ...entry,
    roles: entry.roles.map((role) => ({
      ...role,
      bullets: orderByIds(
        role.bullets.filter((bullet) => !hiddenBulletIds.has(bullet.id)),
        bulletOrderByExperience?.[entry.id],
      ),
    })),
  }));
}

export function mergeCvVersion(
  master: CvMaster,
  version: CvVersion,
): ResolvedCv {
  const hiddenBulletIds = new Set(version.hiddenBulletIds ?? []);

  const experience = filterExperience(
    master.experience,
    hiddenBulletIds,
    version.experienceBulletOrder,
  );

  const projects = orderByIds(
    master.projects,
    version.projectOrder,
  );

  const skills = orderByIds(
    master.skills,
    version.skillCategoryOrder,
  );

  return {
    versionId: version.id,
    versionLabel: version.label,
    name: master.name,
    headline: version.headline ?? master.headline,
    summary: version.summary ?? master.summary,
    contact: master.contact,
    experience,
    projects,
    skills,
    education: master.education,
  };
}
