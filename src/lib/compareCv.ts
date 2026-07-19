import { structuredPatch } from 'diff';
import type {
  CvDiffLine,
  CvDiffSection,
  CvExperience,
  CvProject,
  CvSkillCategory,
  ResolvedCv,
} from '../types/cv';

type BulletEntry = {
  id: string;
  roleTitle: string;
  text: string;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function patchToLines(baseLabel: string, selectedLabel: string, base: string, selected: string): CvDiffLine[] {
  if (base === selected) {
    return [];
  }

  const patch = structuredPatch(
    baseLabel,
    selectedLabel,
    ensureTrailingNewline(base),
    ensureTrailingNewline(selected),
    undefined,
    undefined,
    { context: 2 },
  );

  if (!patch) {
    return [
      { type: 'remove', content: base },
      { type: 'add', content: selected },
    ];
  }

  const lines: CvDiffLine[] = [];

  for (const hunk of patch.hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        lines.push({ type: 'remove', content: line.slice(1) });
        continue;
      }

      if (line.startsWith('+')) {
        lines.push({ type: 'add', content: line.slice(1) });
        continue;
      }

      if (line.startsWith(' ')) {
        lines.push({ type: 'context', content: line.slice(1) });
      }
    }
  }

  return lines;
}

function pushTextSection(
  sections: CvDiffSection[],
  field: string,
  base: string,
  selected: string,
): void {
  const lines = patchToLines('base', 'selected', base, selected);

  if (!lines.length) {
    return;
  }

  sections.push({ field, lines });
}

function collectBullets(experience: CvExperience[]): BulletEntry[] {
  return experience.flatMap((entry) =>
    entry.roles.flatMap((role) =>
      role.bullets.map((bullet) => ({
        id: bullet.id,
        roleTitle: role.title,
        text: normalizeText(bullet.text),
      })),
    ),
  );
}

function formatBulletLine(bullet: BulletEntry): string {
  return `[${bullet.roleTitle}] ${bullet.text}`;
}

function compareBulletLists(base: BulletEntry[], selected: BulletEntry[]): CvDiffSection[] {
  const sections: CvDiffSection[] = [];
  const baseById = new Map(base.map((bullet) => [bullet.id, bullet]));
  const selectedById = new Map(selected.map((bullet) => [bullet.id, bullet]));

  const removed = base.filter((bullet) => !selectedById.has(bullet.id));
  const added = selected.filter((bullet) => !baseById.has(bullet.id));

  if (removed.length) {
    sections.push({
      field: 'Experience - removed bullets',
      lines: removed.map((bullet) => ({
        type: 'remove',
        content: formatBulletLine(bullet),
      })),
    });
  }

  if (added.length) {
    sections.push({
      field: 'Experience - added bullets',
      lines: added.map((bullet) => ({
        type: 'add',
        content: formatBulletLine(bullet),
      })),
    });
  }

  const changedText: CvDiffLine[] = [];

  for (const [id, baseBullet] of baseById) {
    const selectedBullet = selectedById.get(id);

    if (!selectedBullet || baseBullet.text === selectedBullet.text) {
      continue;
    }

    changedText.push(
      { type: 'remove', content: formatBulletLine(baseBullet) },
      { type: 'add', content: formatBulletLine(selectedBullet) },
    );
  }

  if (changedText.length) {
    sections.push({
      field: 'Experience - edited bullets',
      lines: changedText,
    });
  }

  const baseOrder = base.map((bullet) => bullet.id).join('\n');
  const selectedOrder = selected.map((bullet) => bullet.id).join('\n');

  if (baseOrder !== selectedOrder && base.length && selected.length) {
    const baseLines = base
      .map((bullet, index) => `${index + 1}. ${formatBulletLine(bullet)}`)
      .join('\n');
    const selectedLines = selected
      .map((bullet, index) => `${index + 1}. ${formatBulletLine(bullet)}`)
      .join('\n');

    sections.push({
      field: 'Experience - bullet order',
      lines: patchToLines('base-order', 'selected-order', baseLines, selectedLines),
    });
  }

  return sections;
}

function formatProjectBlock(project: CvProject): string {
  return `${project.title}\n${normalizeText(project.description)}`;
}

function compareProjects(base: CvProject[], selected: CvProject[]): CvDiffSection[] {
  const sections: CvDiffSection[] = [];
  const baseById = new Map(base.map((project) => [project.id, project]));
  const selectedById = new Map(selected.map((project) => [project.id, project]));

  const removed = base.filter((project) => !selectedById.has(project.id));
  const added = selected.filter((project) => !baseById.has(project.id));

  if (removed.length) {
    sections.push({
      field: 'Projects - removed',
      lines: removed.flatMap((project) => [
        { type: 'remove' as const, content: project.title },
        { type: 'remove' as const, content: normalizeText(project.description) },
      ]),
    });
  }

  if (added.length) {
    sections.push({
      field: 'Projects - added',
      lines: added.flatMap((project) => [
        { type: 'add' as const, content: project.title },
        { type: 'add' as const, content: normalizeText(project.description) },
      ]),
    });
  }

  for (const [id, baseProject] of baseById) {
    const selectedProject = selectedById.get(id);

    if (!selectedProject) {
      continue;
    }

    const baseBlock = formatProjectBlock(baseProject);
    const selectedBlock = formatProjectBlock(selectedProject);

    if (baseBlock === selectedBlock) {
      continue;
    }

    sections.push({
      field: `Projects - ${baseProject.title}`,
      lines: patchToLines('base', 'selected', baseBlock, selectedBlock),
    });
  }

  const baseOrder = base.map((project) => `${project.id} (${project.title})`).join('\n');
  const selectedOrder = selected.map((project) => `${project.id} (${project.title})`).join('\n');

  if (baseOrder !== selectedOrder) {
    sections.push({
      field: 'Projects - order',
      lines: patchToLines('base-order', 'selected-order', baseOrder, selectedOrder),
    });
  }

  return sections;
}

function formatSkillBlock(skill: CvSkillCategory): string {
  return `${skill.label}\n${skill.items}`;
}

function compareSkills(base: CvSkillCategory[], selected: CvSkillCategory[]): CvDiffSection[] {
  const sections: CvDiffSection[] = [];
  const baseById = new Map(base.map((skill) => [skill.id, skill]));
  const selectedById = new Map(selected.map((skill) => [skill.id, skill]));

  for (const [id, baseSkill] of baseById) {
    const selectedSkill = selectedById.get(id);

    if (!selectedSkill) {
      sections.push({
        field: `Skills - removed ${baseSkill.label}`,
        lines: [{ type: 'remove', content: formatSkillBlock(baseSkill) }],
      });
      continue;
    }

    const baseBlock = formatSkillBlock(baseSkill);
    const selectedBlock = formatSkillBlock(selectedSkill);

    if (baseBlock !== selectedBlock) {
      sections.push({
        field: `Skills - ${baseSkill.label}`,
        lines: patchToLines('base', 'selected', baseBlock, selectedBlock),
      });
    }
  }

  for (const [id, selectedSkill] of selectedById) {
    if (baseById.has(id)) {
      continue;
    }

    sections.push({
      field: `Skills - added ${selectedSkill.label}`,
      lines: [{ type: 'add', content: formatSkillBlock(selectedSkill) }],
    });
  }

  const baseOrder = base.map((skill) => skill.label).join('\n');
  const selectedOrder = selected.map((skill) => skill.label).join('\n');

  if (baseOrder !== selectedOrder) {
    sections.push({
      field: 'Skills - order',
      lines: patchToLines('base-order', 'selected-order', baseOrder, selectedOrder),
    });
  }

  return sections;
}

function formatEducation(cv: ResolvedCv): string {
  return cv.education.entries
    .flatMap((entry) => [
      `${entry.degree} (${entry.period})`,
      ...(entry.details ?? []),
    ])
    .join('\n');
}

export function compareResolvedCvs(base: ResolvedCv, selected: ResolvedCv): CvDiffSection[] {
  const sections: CvDiffSection[] = [];

  pushTextSection(sections, 'Headline', base.headline, selected.headline);
  pushTextSection(sections, 'Summary', normalizeText(base.summary), normalizeText(selected.summary));

  sections.push(...compareBulletLists(collectBullets(base.experience), collectBullets(selected.experience)));
  sections.push(...compareProjects(base.projects, selected.projects));
  sections.push(...compareSkills(base.skills, selected.skills));

  const baseEducation = formatEducation(base);
  const selectedEducation = formatEducation(selected);

  pushTextSection(sections, 'Education', baseEducation, selectedEducation);

  return sections;
}
