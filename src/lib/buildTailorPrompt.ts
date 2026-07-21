import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import type { CvMaster } from '../types/cv';

const TOP_LEVEL_KEYS = new Set([
  'id',
  'label',
  'extends',
  'headline',
  'summary',
  'hiddenBulletIds',
  'experienceBulletOrder',
  'projectOrder',
  'skillCategoryOrder',
  'projectOverrides',
  'bulletOverrides',
  'projectsSectionTitle',
  'footerNote',
  'notes',
]);

const LIST_KEYS = new Set([
  'hiddenBulletIds',
  'projectOrder',
  'skillCategoryOrder',
]);

type RepairContext =
  | { mode: 'root' }
  | { mode: 'summary' }
  | { mode: 'list'; parentKey: string }
  | { mode: 'experienceBulletOrder' }
  | { mode: 'experienceId' };

export function buildTailorPrompt(
  master: CvMaster,
  jobDescription: string,
): string {
  const masterYaml = stringifyYaml(master, {
    lineWidth: 100,
    noRefs: true,
  });

  return `You are helping tailor a CV for a job application.

## Job description
${jobDescription.trim()}

## Candidate master CV (YAML source of truth — do not invent facts)
\`\`\`yaml
${masterYaml}
\`\`\`

## Task
Return ONLY a valid YAML document for a job-specific CV version that extends master.
Do not wrap it in markdown fences. Do not invent employers, titles, skills, or metrics.

Required fields (document must start with id:):
- id: kebab-case slug
- label: short human name for this version
- extends: master

Optional fields you may set (only when useful):
- headline
- summary
- hiddenBulletIds
- experienceBulletOrder
- projectOrder
- skillCategoryOrder
- projectOverrides
- bulletOverrides
- projectsSectionTitle
- footerNote

YAML formatting rules (critical):
- First line must be id:
- Use "- item" for lists, never "* item"
- For summary, use "summary: >" then indent every summary line with exactly two spaces
- Leave one blank line after the summary before the next key
- Do not use em dashes in text; use a hyphen (-) or comma instead
- If you use bulletOverrides, every value must be double-quoted on one line
- Prefer hiddenBulletIds and reordering over bulletOverrides when possible
- Under experienceBulletOrder, indent experience ids two spaces and bullet ids four spaces

Example (follow this shape exactly):
id: example-role
label: Example Role
extends: master
headline: Software Engineer - Example Focus
summary: >
  Short tailored summary using only facts from master.

hiddenBulletIds:
  - acme-quality
experienceBulletOrder:
  acme:
    - acme-architecture
    - acme-feature
projectOrder:
  - project-alpha
  - project-beta
skillCategoryOrder:
  - languages
  - infrastructure

Return the YAML now.`;
}

export function extractYamlFromAiReply(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:yaml|yml)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return normalizeAiTailorYaml(fenced[1].trim());
  }

  return normalizeAiTailorYaml(trimmed);
}

export function normalizeAiTailorYaml(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');
  const startIndex = lines.findIndex((line) => /^(id|label):/.test(line.trim()));

  if (startIndex > 0) {
    text = lines.slice(startIndex).join('\n');
  }

  text = repairAiTailorYaml(text);
  text = quoteBulletOverrideValues(text);

  return text.trim();
}

export function repairAiTailorYaml(raw: string): string {
  const lines = raw.split('\n');
  const result: string[] = [];
  let context: RepairContext = { mode: 'root' };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push('');
      continue;
    }

    const topLevelKey = parseTopLevelKey(line);
    if (topLevelKey && TOP_LEVEL_KEYS.has(topLevelKey.name)) {
      if (context.mode === 'summary' && result.at(-1)?.trim() !== '') {
        result.push('');
      }

      result.push(formatKeyLine(topLevelKey.name, topLevelKey.rest));
      context = contextForTopLevelKey(topLevelKey.name, topLevelKey.rest);
      continue;
    }

    if (context.mode === 'summary') {
      result.push(`  ${trimmed}`);
      continue;
    }

    const listItem = parseListItem(trimmed);
    if (listItem) {
      if (context.mode === 'experienceId') {
        result.push(`    - ${listItem}`);
        continue;
      }

      if (context.mode === 'list' || LIST_KEYS.has(getOpenListParent(context))) {
        result.push(`  - ${listItem}`);
        continue;
      }

      if (context.mode === 'experienceBulletOrder') {
        result.push(`    - ${listItem}`);
        continue;
      }

      result.push(`  - ${listItem}`);
      continue;
    }

    if (context.mode === 'experienceBulletOrder') {
      const experienceKey = trimmed.match(/^([a-z][\w-]*):\s*$/);
      if (experienceKey) {
        result.push(`  ${experienceKey[0]}`);
        context = { mode: 'experienceId' };
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

function getOpenListParent(context: RepairContext): string {
  return context.mode === 'list' ? context.parentKey : '';
}

function parseTopLevelKey(line: string): { name: string; rest: string } | null {
  if (line.startsWith(' ') || line.startsWith('\t')) {
    return null;
  }

  const match = line.trim().match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    rest: match[2],
  };
}

function formatKeyLine(name: string, rest: string): string {
  if (!rest) {
    return `${name}:`;
  }

  return `${name}: ${rest}`;
}

function contextForTopLevelKey(name: string, rest: string): RepairContext {
  if (name === 'summary' && (rest === '>' || rest === '|' || rest === '')) {
    return { mode: 'summary' };
  }

  if (LIST_KEYS.has(name)) {
    return { mode: 'list', parentKey: name };
  }

  if (name === 'experienceBulletOrder') {
    return { mode: 'experienceBulletOrder' };
  }

  return { mode: 'root' };
}

function parseListItem(trimmed: string): string | null {
  const starMatch = trimmed.match(/^\*\s+(.+)$/);
  if (starMatch) {
    return starMatch[1];
  }

  const dashMatch = trimmed.match(/^-\s+(.+)$/);
  if (dashMatch) {
    return dashMatch[1];
  }

  return null;
}

function quoteBulletOverrideValues(yaml: string): string {
  const lines = yaml.split('\n');
  const result: string[] = [];
  let inBulletOverrides = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^bulletOverrides:\s*$/.test(trimmed)) {
      inBulletOverrides = true;
      result.push(line);
      continue;
    }

    if (inBulletOverrides) {
      const entryMatch = line.match(/^(\s+)([A-Za-z0-9_-]+):\s*(.+)$/);

      if (entryMatch) {
        const [, indent, key, value] = entryMatch;

        if (value.startsWith('"') || value.startsWith("'")) {
          result.push(line);
          continue;
        }

        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        result.push(`${indent}${key}: "${escaped}"`);
        continue;
      }

      if (trimmed && /^[a-zA-Z][\w-]*:/.test(trimmed) && !line.startsWith(' ')) {
        inBulletOverrides = false;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

export function formatAiYamlParseError(error: unknown, yamlText: string): string {
  const base = error instanceof Error ? error.message : 'Failed to parse AI YAML.';
  const hasDocumentStart = /^(id|label):/m.test(yamlText);

  if (!hasDocumentStart) {
    return `${base} The reply looks truncated — copy the full YAML starting with "id:".`;
  }

  if (base.includes('multiline key') || base.includes('block mapping')) {
    return `${base} Try Copy prompt again, or paste YAML starting at "id:" with "-" list markers.`;
  }

  return base;
}

export function parseAiTailorYaml(raw: string): Record<string, unknown> {
  const yamlText = extractYamlFromAiReply(raw);

  try {
    const parsed = parseYaml(yamlText);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI reply is not a YAML object.');
    }

    return parsed as Record<string, unknown>;
  } catch (parseError) {
    throw new Error(formatAiYamlParseError(parseError, yamlText));
  }
}
