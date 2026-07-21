import { load as parseYaml } from 'js-yaml';
import masterExampleRaw from '../../data/master.example.yaml?raw';
import type { CvMaster } from '../types/cv';
import { formatAiYamlParseError } from './buildTailorPrompt';

function extractRawYaml(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:yaml|yml)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function normalizeAiMasterYaml(raw: string): string {
  let text = extractRawYaml(raw).replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');
  const startIndex = lines.findIndex((line) => /^name:/.test(line.trim()));

  if (startIndex > 0) {
    text = lines.slice(startIndex).join('\n');
  }

  text = text.replace(/^\s*\*\s+/gm, '  - ');
  text = fixSummaryBlock(text);

  return text.trim();
}

function fixSummaryBlock(yaml: string): string {
  const lines = yaml.split('\n');
  const result: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    result.push(line);

    if (!/^summary:\s*[>|]/.test(line.trim())) {
      continue;
    }

    let cursor = index + 1;
    while (cursor < lines.length) {
      const nextLine = lines[cursor];

      if (nextLine.trim() === '') {
        result.push(nextLine);
        cursor += 1;
        continue;
      }

      if (/^\s{2,}\S/.test(nextLine)) {
        result.push(nextLine);
        cursor += 1;
        index = cursor - 1;
        continue;
      }

      if (/^[a-zA-Z][\w-]*:/.test(nextLine.trim())) {
        result.push('');
        result.push(nextLine);
        index = cursor;
      }

      break;
    }
  }

  return result.join('\n');
}

export function buildMasterImportPrompt(cvText: string): string {
  return `You are converting an existing CV/resume into CV Studio master YAML.

## Source CV text (paste from LinkedIn, Word, PDF export, etc.)
${cvText.trim()}

## Target schema (CV Studio master YAML)
Use this shape exactly. Do not invent employers, titles, skills, dates, or metrics not supported by the source text.

\`\`\`yaml
${masterExampleRaw.trim()}
\`\`\`

## Task
Return ONLY a valid YAML master document for CV Studio.
Do not wrap it in markdown fences.

Required top-level fields:
- name
- headline
- summary
- contact (phone, email, linkedin, portfolio)
- experience (array with id, company, location, tenure, roles with bullets)
- projects
- skills
- education

Rules:
- First line must be name:
- Use kebab-case ids for experience entries, bullets, and projects (e.g. wix, wix-feature)
- Use "- item" for lists, never "* item"
- For summary, use "summary: >" then indent every summary line with two spaces
- Leave a blank line after the summary before the next key
- Do not use em dashes; use a hyphen (-) or comma instead
- Keep bullet text honest and concise; omit sections missing from the source
- If a field is unknown, use a sensible placeholder rather than fabricating experience

Return the master YAML now.`;
}

function assertCvMaster(value: unknown): asserts value is CvMaster {
  if (!value || typeof value !== 'object') {
    throw new Error('AI reply is not a YAML object.');
  }

  const master = value as Partial<CvMaster>;

  if (!master.name?.trim()) {
    throw new Error('Master YAML must include name.');
  }

  if (!master.headline?.trim()) {
    throw new Error('Master YAML must include headline.');
  }

  if (!master.summary?.trim()) {
    throw new Error('Master YAML must include summary.');
  }

  if (!master.contact?.email?.trim()) {
    throw new Error('Master YAML must include contact.email.');
  }

  if (!Array.isArray(master.experience) || master.experience.length === 0) {
    throw new Error('Master YAML must include at least one experience entry.');
  }
}

export function parseAiMasterYaml(raw: string): CvMaster {
  const yamlText = normalizeAiMasterYaml(raw);

  try {
    const parsed = parseYaml(yamlText);
    assertCvMaster(parsed);
    return parsed;
  } catch (parseError) {
    throw new Error(formatAiYamlParseError(parseError, yamlText));
  }
}
