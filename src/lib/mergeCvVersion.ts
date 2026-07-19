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

function buildExperience(
  master: CvMaster,
  version: CvVersion,
): CvExperience[] {
  const hiddenBulletIds = new Set(version.hiddenBulletIds ?? []);
  const bulletOrder = version.experienceBulletOrder;

  const fromMaster = filterExperience(
    master.experience,
    hiddenBulletIds,
    bulletOrder,
  );
  const additions = filterExperience(
    version.experienceAdditions ?? [],
    hiddenBulletIds,
    bulletOrder,
  );

  return orderByIds(
    [...fromMaster, ...additions],
    version.experienceOrder,
  );
}

export function mergeCvVersion(
  master: CvMaster,
  version: CvVersion,
): ResolvedCv {
  const experience = buildExperience(master, version);

  const projects = orderByIds(
    master.projects
      .filter((project) => !version.hiddenProjectIds?.includes(project.id))
      .map((project) => {
        const override = version.projectOverrides?.[project.id];

        if (!override) {
          return project;
        }

        return {
          ...project,
          ...override,
        };
      }),
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
    education: version.education ?? master.education,
  };
}
