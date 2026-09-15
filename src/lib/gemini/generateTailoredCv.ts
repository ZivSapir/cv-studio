import type { Schema } from '@google/genai';
import { dump as stringifyYaml } from 'js-yaml';
import type { CvMaster, CvVersion } from '../../types/cv';
import { requireGeminiApiKey } from './geminiApiKey';
import {
  GEMINI_MODEL_PRIMARY,
  callWithGeminiRetry,
  generateWithModelFallback,
} from './geminiUtils';

const TAILORING_RULES = `You are tailoring one candidate's CV for a specific job posting.

Source of truth: the master CV YAML below is the ONLY source of facts (employers, titles,
dates, bullets, projects, skills). The job description decides what to EMPHASIZE, not what to
invent. Tailoring means reordering and rewording — same person, different spotlight — never
adding a skill, tool, title, employer, or metric that is not already in master.

Hard rules:
- Never invent experience, skills, titles, tools, years, or metrics.
- Every bulletId, projectId, experienceId, and skillCategoryId you reference MUST be one of
  the ids given to you — you cannot invent new ones or misspell existing ones.
- skillOverrides may only reorder or rephrase items already present in that skill category's
  "items" string — never add a technology that is not already listed there.
- Do not use headline or summary to say the candidate lacks a JD requirement, is
  under-qualified, or is a weak match. Only state truthful strengths — the employer judges fit.
- Do not adopt the job posting's own job title as the candidate's self-description if it is
  narrower than master's headline/summary (e.g. do not turn a full-stack engineer into a
  "backend engineer" just because the posting says "backend"). Emphasize matching parts of
  master instead of rewriting identity to match the posting's label.
- No em dashes anywhere in generated text (headline, summary, bullet/project overrides); use a
  comma, colon, semicolon, or regular hyphen instead.
- When overriding a project description, start with one plain-English sentence on what the
  product is (reuse master's own project description for this), then role-specific stack
  details — never lead with tech stack only.
- If one employer/role's bullets span multiple themes (e.g. core engineering vs. a supporting
  theme like QA/ops/admin), do not give the supporting theme more visible bullets than the
  primary theme unless the JD is specifically and entirely about that supporting theme.
- Prefer hiding/reordering bullets and projects over rewriting them; only override wording
  when reordering alone will not make the emphasis clear.
- Prefer omitting a field entirely over including it with no real change.`;

export type GeminiFitFeedback = {
  status: 'overflow' | 'sparse';
  sparePx: number;
};

type CvVersionOverride = Pick<
  CvVersion,
  | 'headline'
  | 'summary'
  | 'hiddenBulletIds'
  | 'hiddenProjectIds'
  | 'bulletOverrides'
  | 'projectOverrides'
  | 'experienceBulletOrder'
  | 'projectOrder'
  | 'skillCategoryOrder'
  | 'skillOverrides'
  | 'projectsSectionTitle'
  | 'footerNote'
>;

export type GeneratedTailoredCv = {
  id: string;
  label: string;
} & CvVersionOverride;

/** `@google/genai`'s Type enum is loaded dynamically (see loadGenAi below) so the SDK is not
 * bundled into the app until a user actually generates or refines with Gemini. */
type GenAiTypeEnum = typeof import('@google/genai').Type;

async function loadGenAi() {
  return import('@google/genai');
}

function collectBulletIds(master: CvMaster): string[] {
  return master.experience.flatMap((experience) =>
    experience.roles.flatMap((role) => role.bullets.map((bullet) => bullet.id)),
  );
}

function collectExperienceIds(master: CvMaster): string[] {
  return master.experience.map((experience) => experience.id);
}

function collectProjectIds(master: CvMaster): string[] {
  return master.projects.map((project) => project.id);
}

function collectSkillCategoryIds(master: CvMaster): string[] {
  return master.skills.map((skill) => skill.id);
}

function enumOrString(Type: GenAiTypeEnum, ids: string[]): Schema {
  if (ids.length === 0) {
    return { type: Type.STRING };
  }

  return { type: Type.STRING, enum: ids };
}

function nullableString(Type: GenAiTypeEnum): Schema {
  return { type: Type.STRING, nullable: true };
}

function nullableArray(Type: GenAiTypeEnum, items: Schema, description?: string): Schema {
  return { type: Type.ARRAY, nullable: true, items, ...(description ? { description } : {}) };
}

function buildResponseSchema(Type: GenAiTypeEnum, master: CvMaster): Schema {
  const bulletIds = collectBulletIds(master);
  const experienceIds = collectExperienceIds(master);
  const projectIds = collectProjectIds(master);
  const skillIds = collectSkillCategoryIds(master);

  return {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: 'Kebab-case slug for this CV version, e.g. acme-backend-engineer.',
      },
      label: {
        type: Type.STRING,
        description: 'Short human-readable name for this version, e.g. "Acme - Backend Engineer".',
      },
      headline: nullableString(Type),
      summary: nullableString(Type),
      hiddenBulletIds: nullableArray(Type, enumOrString(Type, bulletIds)),
      hiddenProjectIds: nullableArray(Type, enumOrString(Type, projectIds)),
      bulletOverrides: nullableArray(
        Type,
        {
          type: Type.OBJECT,
          properties: {
            bulletId: enumOrString(Type, bulletIds),
            text: { type: Type.STRING },
          },
          required: ['bulletId', 'text'],
        },
        'Reworded copy for specific existing bullets only.',
      ),
      projectOverrides: nullableArray(Type, {
        type: Type.OBJECT,
        properties: {
          projectId: enumOrString(Type, projectIds),
          title: nullableString(Type),
          description: nullableString(Type),
        },
        required: ['projectId', 'title', 'description'],
      }),
      experienceBulletOrder: nullableArray(
        Type,
        {
          type: Type.OBJECT,
          properties: {
            experienceId: enumOrString(Type, experienceIds),
            bulletIds: {
              type: Type.ARRAY,
              items: enumOrString(Type, bulletIds),
            },
          },
          required: ['experienceId', 'bulletIds'],
        },
        'New bullet order for a subset of experience entries.',
      ),
      projectOrder: nullableArray(Type, enumOrString(Type, projectIds)),
      skillCategoryOrder: nullableArray(Type, enumOrString(Type, skillIds)),
      skillOverrides: nullableArray(
        Type,
        {
          type: Type.OBJECT,
          properties: {
            skillCategoryId: enumOrString(Type, skillIds),
            label: nullableString(Type),
            items: nullableString(Type),
          },
          required: ['skillCategoryId', 'label', 'items'],
        },
        'Reorder/rephrase items already in that skill category only — never add new ones.',
      ),
      projectsSectionTitle: nullableString(Type),
      footerNote: nullableString(Type),
    },
    required: [
      'id',
      'label',
      'headline',
      'summary',
      'hiddenBulletIds',
      'hiddenProjectIds',
      'bulletOverrides',
      'projectOverrides',
      'experienceBulletOrder',
      'projectOrder',
      'skillCategoryOrder',
      'skillOverrides',
      'projectsSectionTitle',
      'footerNote',
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toBulletOverrides(
  raw: unknown,
  validBulletIds: Set<string>,
): Record<string, string> | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const result: Record<string, string> = {};

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }

    const bulletId = nonEmptyString(entry.bulletId);
    const text = nonEmptyString(entry.text);

    if (bulletId && text && validBulletIds.has(bulletId)) {
      result[bulletId] = text;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function toProjectOverrides(
  raw: unknown,
  validProjectIds: Set<string>,
): CvVersion['projectOverrides'] {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const result: NonNullable<CvVersion['projectOverrides']> = {};

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }

    const projectId = nonEmptyString(entry.projectId);
    if (!projectId || !validProjectIds.has(projectId)) {
      continue;
    }

    const title = nonEmptyString(entry.title);
    const description = nonEmptyString(entry.description);

    if (title || description) {
      result[projectId] = {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function toExperienceBulletOrder(
  raw: unknown,
  validExperienceIds: Set<string>,
  validBulletIds: Set<string>,
): Record<string, string[]> | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const result: Record<string, string[]> = {};

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }

    const experienceId = nonEmptyString(entry.experienceId);
    if (!experienceId || !validExperienceIds.has(experienceId)) {
      continue;
    }

    const bulletIds = Array.isArray(entry.bulletIds)
      ? entry.bulletIds.filter(
          (id): id is string => typeof id === 'string' && validBulletIds.has(id),
        )
      : [];

    if (bulletIds.length > 0) {
      result[experienceId] = bulletIds;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function toSkillOverrides(
  raw: unknown,
  validSkillIds: Set<string>,
): CvVersion['skillOverrides'] {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const result: NonNullable<CvVersion['skillOverrides']> = {};

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }

    const skillCategoryId = nonEmptyString(entry.skillCategoryId);
    if (!skillCategoryId || !validSkillIds.has(skillCategoryId)) {
      continue;
    }

    const label = nonEmptyString(entry.label);
    const items = nonEmptyString(entry.items);

    if (label || items) {
      result[skillCategoryId] = {
        ...(label ? { label } : {}),
        ...(items ? { items } : {}),
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function toStringArray(raw: unknown, validIds: Set<string>): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const filtered = raw.filter(
    (id): id is string => typeof id === 'string' && validIds.has(id),
  );

  return filtered.length > 0 ? filtered : undefined;
}

/**
 * Converts Gemini's array-of-pairs wire format (needed so ids can be schema-enum-constrained)
 * back into the CvVersion record shape, dropping anything that references an id that doesn't
 * exist in master — a defense-in-depth check beyond the schema enum itself.
 */
export function toGeneratedTailoredCv(raw: unknown, master: CvMaster): GeneratedTailoredCv {
  if (!isRecord(raw)) {
    throw new Error('Gemini returned an invalid CV payload.');
  }

  const id = nonEmptyString(raw.id);
  const label = nonEmptyString(raw.label);

  if (!id || !label) {
    throw new Error('Gemini reply is missing id or label.');
  }

  const validBulletIds = new Set(collectBulletIds(master));
  const validExperienceIds = new Set(collectExperienceIds(master));
  const validProjectIds = new Set(collectProjectIds(master));
  const validSkillIds = new Set(collectSkillCategoryIds(master));

  return {
    id,
    label,
    headline: nonEmptyString(raw.headline),
    summary: nonEmptyString(raw.summary),
    hiddenBulletIds: toStringArray(raw.hiddenBulletIds, validBulletIds),
    hiddenProjectIds: toStringArray(raw.hiddenProjectIds, validProjectIds),
    bulletOverrides: toBulletOverrides(raw.bulletOverrides, validBulletIds),
    projectOverrides: toProjectOverrides(raw.projectOverrides, validProjectIds),
    experienceBulletOrder: toExperienceBulletOrder(
      raw.experienceBulletOrder,
      validExperienceIds,
      validBulletIds,
    ),
    projectOrder: toStringArray(raw.projectOrder, validProjectIds),
    skillCategoryOrder: toStringArray(raw.skillCategoryOrder, validSkillIds),
    skillOverrides: toSkillOverrides(raw.skillOverrides, validSkillIds),
    projectsSectionTitle: nonEmptyString(raw.projectsSectionTitle),
    footerNote: nonEmptyString(raw.footerNote),
  };
}

function fitFeedbackNote(fitFeedback: GeminiFitFeedback | undefined): string {
  if (!fitFeedback) {
    return '';
  }

  return fitFeedback.status === 'overflow'
    ? `\n\nThe current draft overflows the printed page by about ${Math.round(fitFeedback.sparePx)}px. Shorten wording and hide one or two lower-priority bullets/projects to fit one A4 page.`
    : `\n\nThe current draft leaves about ${Math.round(fitFeedback.sparePx)}px of empty space on the printed page. Add back a relevant hidden bullet or expand wording slightly so the page looks fuller, without inventing anything new.`;
}

function buildGenerateContents(
  master: CvMaster,
  jobDescription: string,
  fitFeedback?: GeminiFitFeedback,
): string {
  const masterYaml = stringifyYaml(master, { lineWidth: 100, noRefs: true });

  return [
    '## Job description',
    jobDescription.trim(),
    '',
    '## Candidate master CV (YAML, source of truth)',
    '```yaml',
    masterYaml,
    '```',
    fitFeedbackNote(fitFeedback),
  ].join('\n');
}

async function runGeneration(params: {
  apiKey: string | null | undefined;
  master: CvMaster;
  contents: string;
}): Promise<GeneratedTailoredCv> {
  const apiKey = requireGeminiApiKey(params.apiKey);
  const { GoogleGenAI, Type } = await loadGenAi();
  const ai = new GoogleGenAI({ apiKey });

  const response = await callWithGeminiRetry(() =>
    generateWithModelFallback(ai, {
      model: GEMINI_MODEL_PRIMARY,
      contents: params.contents,
      config: {
        systemInstruction: TAILORING_RULES,
        responseMimeType: 'application/json',
        responseSchema: buildResponseSchema(Type, params.master),
      },
    }),
  );

  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }

  return toGeneratedTailoredCv(JSON.parse(response.text), params.master);
}

export async function generateTailoredCv(params: {
  apiKey: string | null | undefined;
  master: CvMaster;
  jobDescription: string;
  fitFeedback?: GeminiFitFeedback;
}): Promise<GeneratedTailoredCv> {
  return runGeneration({
    apiKey: params.apiKey,
    master: params.master,
    contents: buildGenerateContents(params.master, params.jobDescription, params.fitFeedback),
  });
}

function buildRefineContents(
  master: CvMaster,
  jobDescription: string,
  currentVersion: CvVersion,
  instruction: string,
  fitFeedback?: GeminiFitFeedback,
): string {
  const masterYaml = stringifyYaml(master, { lineWidth: 100, noRefs: true });
  const currentOverridesYaml = stringifyYaml(
    {
      headline: currentVersion.headline,
      summary: currentVersion.summary,
      hiddenBulletIds: currentVersion.hiddenBulletIds,
      hiddenProjectIds: currentVersion.hiddenProjectIds,
      bulletOverrides: currentVersion.bulletOverrides,
      projectOverrides: currentVersion.projectOverrides,
      experienceBulletOrder: currentVersion.experienceBulletOrder,
      projectOrder: currentVersion.projectOrder,
      skillCategoryOrder: currentVersion.skillCategoryOrder,
      skillOverrides: currentVersion.skillOverrides,
      projectsSectionTitle: currentVersion.projectsSectionTitle,
      footerNote: currentVersion.footerNote,
    },
    { lineWidth: 100, noRefs: true },
  );

  return [
    '## Job description',
    jobDescription.trim() || '(none provided)',
    '',
    '## Candidate master CV (YAML, source of truth)',
    '```yaml',
    masterYaml,
    '```',
    '',
    '## Current tailored version (this is the full current state — carry forward anything the instruction below does not ask you to change)',
    '```yaml',
    currentOverridesYaml,
    '```',
    '',
    '## Requested change',
    instruction.trim(),
    fitFeedbackNote(fitFeedback),
    '',
    'Return the FULL updated version reflecting the requested change — including everything from',
    'the current version that the instruction did not ask you to change. Omit a field only if it',
    'should now be unset.',
  ].join('\n');
}

export async function refineTailoredCv(params: {
  apiKey: string | null | undefined;
  master: CvMaster;
  jobDescription: string;
  currentVersion: CvVersion;
  instruction: string;
  fitFeedback?: GeminiFitFeedback;
}): Promise<GeneratedTailoredCv> {
  const result = await runGeneration({
    apiKey: params.apiKey,
    master: params.master,
    contents: buildRefineContents(
      params.master,
      params.jobDescription,
      params.currentVersion,
      params.instruction,
      params.fitFeedback,
    ),
  });

  return {
    ...result,
    id: params.currentVersion.id,
    label: params.currentVersion.label,
  };
}
