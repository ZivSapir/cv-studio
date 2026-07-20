import type {
  CvBullet,
  CvExperience,
  CvMaster,
  CvVersion,
} from '../types/cv';

function moveIdInList(
  ids: string[],
  id: string,
  direction: 'up' | 'down',
): string[] {
  const index = ids.indexOf(id);

  if (index === -1) {
    return ids;
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= ids.length) {
    return ids;
  }

  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function toggleIdInList(
  ids: string[] | undefined,
  id: string,
): string[] {
  const current = ids ?? [];

  if (current.includes(id)) {
    return current.filter((entry) => entry !== id);
  }

  return [...current, id];
}

function collectExperienceIds(
  master: CvMaster,
  version: CvVersion,
): string[] {
  if (version.experienceOrder?.length) {
    return [...version.experienceOrder];
  }

  const additionIds = (version.experienceAdditions ?? []).map((entry) => entry.id);
  return [
    ...master.experience.map((entry) => entry.id),
    ...additionIds,
  ];
}

function collectProjectIds(
  master: CvMaster,
  version: CvVersion,
): string[] {
  if (version.projectOrder?.length) {
    return [...version.projectOrder];
  }

  return master.projects.map((project) => project.id);
}

function collectBulletIdsForExperience(
  master: CvMaster,
  version: CvVersion,
  experienceId: string,
): string[] {
  const existingOrder = version.experienceBulletOrder?.[experienceId];

  if (existingOrder?.length) {
    return [...existingOrder];
  }

  const masterEntry = master.experience.find((entry) => entry.id === experienceId);
  const additionEntry = version.experienceAdditions?.find(
    (entry) => entry.id === experienceId,
  );
  const entry = masterEntry ?? additionEntry;

  if (!entry) {
    return [];
  }

  return entry.roles.flatMap((role) => role.bullets.map((bullet) => bullet.id));
}

export function setVersionHeadline(
  version: CvVersion,
  headline: string,
): CvVersion {
  return {
    ...version,
    headline,
  };
}

export function setVersionSummary(
  version: CvVersion,
  summary: string,
): CvVersion {
  return {
    ...version,
    summary,
  };
}

export function setBulletText(
  version: CvVersion,
  bulletId: string,
  text: string,
): CvVersion {
  return {
    ...version,
    bulletOverrides: {
      ...version.bulletOverrides,
      [bulletId]: text,
    },
  };
}

export function setProjectField(
  version: CvVersion,
  projectId: string,
  field: 'title' | 'description',
  value: string,
): CvVersion {
  const previous = version.projectOverrides?.[projectId] ?? {};

  return {
    ...version,
    projectOverrides: {
      ...version.projectOverrides,
      [projectId]: {
        ...previous,
        [field]: value,
      },
    },
  };
}

export function moveExperience(
  master: CvMaster,
  version: CvVersion,
  experienceId: string,
  direction: 'up' | 'down',
): CvVersion {
  return {
    ...version,
    experienceOrder: moveIdInList(
      collectExperienceIds(master, version),
      experienceId,
      direction,
    ),
  };
}

export function moveProject(
  master: CvMaster,
  version: CvVersion,
  projectId: string,
  direction: 'up' | 'down',
): CvVersion {
  return {
    ...version,
    projectOrder: moveIdInList(
      collectProjectIds(master, version),
      projectId,
      direction,
    ),
  };
}

export function moveBullet(
  master: CvMaster,
  version: CvVersion,
  experienceId: string,
  bulletId: string,
  direction: 'up' | 'down',
): CvVersion {
  const nextOrder = moveIdInList(
    collectBulletIdsForExperience(master, version, experienceId),
    bulletId,
    direction,
  );

  return {
    ...version,
    experienceBulletOrder: {
      ...version.experienceBulletOrder,
      [experienceId]: nextOrder,
    },
  };
}

export function toggleHiddenBullet(
  version: CvVersion,
  bulletId: string,
): CvVersion {
  return {
    ...version,
    hiddenBulletIds: toggleIdInList(version.hiddenBulletIds, bulletId),
  };
}

export function toggleHiddenProject(
  version: CvVersion,
  projectId: string,
): CvVersion {
  return {
    ...version,
    hiddenProjectIds: toggleIdInList(version.hiddenProjectIds, projectId),
  };
}

export type HiddenBulletInfo = {
  id: string;
  text: string;
  experienceId: string;
};

function resolveBulletText(
  bullet: CvBullet,
  version: CvVersion,
): string {
  return version.bulletOverrides?.[bullet.id] ?? bullet.text;
}

function bulletsFromExperience(
  entry: CvExperience,
  version: CvVersion,
): HiddenBulletInfo[] {
  return entry.roles.flatMap((role) =>
    role.bullets.map((bullet) => ({
      id: bullet.id,
      text: resolveBulletText(bullet, version),
      experienceId: entry.id,
    })),
  );
}

export function listHiddenBullets(
  master: CvMaster,
  version: CvVersion,
): HiddenBulletInfo[] {
  const hiddenIds = new Set(version.hiddenBulletIds ?? []);

  if (hiddenIds.size === 0) {
    return [];
  }

  const allBullets = [
    ...master.experience.flatMap((entry) => bulletsFromExperience(entry, version)),
    ...(version.experienceAdditions ?? []).flatMap((entry) =>
      bulletsFromExperience(entry, version),
    ),
  ];

  return allBullets.filter((bullet) => hiddenIds.has(bullet.id));
}

export type HiddenProjectInfo = {
  id: string;
  title: string;
};

export function listHiddenProjects(
  master: CvMaster,
  version: CvVersion,
): HiddenProjectInfo[] {
  const hiddenIds = new Set(version.hiddenProjectIds ?? []);

  if (hiddenIds.size === 0) {
    return [];
  }

  return master.projects
    .filter((project) => hiddenIds.has(project.id))
    .map((project) => ({
      id: project.id,
      title: version.projectOverrides?.[project.id]?.title ?? project.title,
    }));
}

export function versionPayloadForSave(version: CvVersion): CvVersion {
  const {
    kind: _kind,
    ...payload
  } = version;

  return payload;
}
