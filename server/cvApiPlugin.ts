import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dump as stringifyYaml, load as parseYaml } from 'js-yaml';
import type { Plugin } from 'vite';

type CvExperienceFile = {
  id: string;
  company: string;
  location: string;
  tenure: string;
  roles: {
    title: string;
    internalPeriod?: string;
    bullets: {
      id: string;
      text: string;
      tags?: string[];
    }[];
  }[];
};

type CvEducationFile = {
  institution: string;
  entries: {
    degree: string;
    period: string;
    details?: string[];
  }[];
};

type CvVersionFile = {
  id: string;
  label: string;
  extends: 'master';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  headline?: string;
  summary?: string;
  hiddenBulletIds?: string[];
  hiddenProjectIds?: string[];
  bulletOverrides?: Record<string, string>;
  projectOverrides?: Record<string, { title?: string; description?: string }>;
  experienceAdditions?: CvExperienceFile[];
  experienceOrder?: string[];
  experienceBulletOrder?: Record<string, string[]>;
  projectOrder?: string[];
  skillCategoryOrder?: string[];
  education?: CvEducationFile;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BASES_DIR = path.join(DATA_DIR, 'bases');
const SAVED_DIR = path.join(DATA_DIR, 'saved');
const BASE_PROFILE_ORDER = ['frontend-cv', 'data-engineer-cv', 'fullstack-cv'];
const COMPARE_BASE_ID = 'frontend-cv';
const LEGACY_BASE_PATH = path.join(DATA_DIR, 'base.yaml');

type DataSource = 'local' | 'example';

function parseDataSource(value: string | null): DataSource {
  return value === 'example' ? 'example' : 'local';
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cv';
}

function sortBaseProfiles(versions: CvVersionFile[]): CvVersionFile[] {
  const orderIndex = (id: string) => {
    const index = BASE_PROFILE_ORDER.indexOf(id);
    return index === -1 ? BASE_PROFILE_ORDER.length : index;
  };

  return [...versions].sort((left, right) => {
    const orderDiff = orderIndex(left.id) - orderIndex(right.id);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return left.label.localeCompare(right.label);
  });
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readYamlFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return parseYaml(raw) as T;
}

async function writeYamlFile(
  filePath: string,
  data: unknown,
): Promise<void> {
  const content = stringifyYaml(data, {
    lineWidth: 100,
    noRefs: true,
  });

  await fs.writeFile(filePath, content, 'utf8');
}

async function ensureSavedDir(): Promise<void> {
  await fs.mkdir(SAVED_DIR, { recursive: true });
}

async function ensureBasesDir(): Promise<void> {
  await fs.mkdir(BASES_DIR, { recursive: true });
}

async function listBaseVersions(source: DataSource): Promise<CvVersionFile[]> {
  await ensureBasesDir();
  const entries = await fs.readdir(BASES_DIR);
  const versions: CvVersionFile[] = [];

  for (const entry of entries) {
    if (source === 'example') {
      if (!entry.endsWith('.example.yaml')) {
        continue;
      }
    } else if (entry.endsWith('.example.yaml') || !entry.endsWith('.yaml')) {
      continue;
    }

    const version = await readYamlFile<CvVersionFile>(path.join(BASES_DIR, entry));
    versions.push(version);
  }

  if (versions.length === 0 && source === 'local') {
    try {
      const legacyBase = await readYamlFile<CvVersionFile>(LEGACY_BASE_PATH);
      versions.push({
        ...legacyBase,
        id: legacyBase.id === 'base' ? COMPARE_BASE_ID : legacyBase.id,
        label: legacyBase.label === 'Base CV' ? 'Frontend CV' : legacyBase.label,
      });
    } catch {
      // no legacy base.yaml
    }
  }

  return sortBaseProfiles(versions);
}

async function listSavedVersions(source: DataSource): Promise<CvVersionFile[]> {
  await ensureSavedDir();
  const entries = await fs.readdir(SAVED_DIR);
  const versions: CvVersionFile[] = [];

  for (const entry of entries) {
    if (source === 'example') {
      if (!entry.endsWith('.example.yaml')) {
        continue;
      }
    } else if (entry.endsWith('.example.yaml')) {
      continue;
    } else if (!entry.endsWith('.yaml')) {
      continue;
    }

    const version = await readYamlFile<CvVersionFile>(path.join(SAVED_DIR, entry));
    versions.push(version);
  }

  return versions.sort((left, right) => left.label.localeCompare(right.label));
}

async function findLocalVersion(sourceId: string): Promise<CvVersionFile | undefined> {
  const bases = await listBaseVersions('local');
  const baseMatch = bases.find((entry) => entry.id === sourceId);

  if (baseMatch) {
    return baseMatch;
  }

  const saved = await listSavedVersions('local');
  return saved.find((entry) => entry.id === sourceId);
}

function getBaseFilePath(id: string): string {
  return path.join(BASES_DIR, `${id}.yaml`);
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function stripVersionMeta(version: CvVersionFile): Omit<CvVersionFile, 'id' | 'label' | 'createdAt' | 'updatedAt'> {
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
    education: version.education,
  };
}

function isBaseProfileId(id: string): boolean {
  return BASE_PROFILE_ORDER.includes(id);
}

async function resolveLocalVersionPath(
  id: string,
): Promise<{ filePath: string; kind: 'base' | 'saved' } | null> {
  const basePath = getBaseFilePath(id);

  try {
    await fs.access(basePath);
    return {
      filePath: basePath,
      kind: 'base',
    };
  } catch {
    // not a base file
  }

  const savedPath = path.join(SAVED_DIR, `${id}.yaml`);

  try {
    await fs.access(savedPath);
    return {
      filePath: savedPath,
      kind: 'saved',
    };
  } catch {
    return null;
  }
}

async function uniqueSavedPath(id: string): Promise<string> {
  let candidate = `${id}.yaml`;
  let suffix = 2;

  while (true) {
    try {
      await fs.access(path.join(SAVED_DIR, candidate));
      candidate = `${id}-${suffix}.yaml`;
      suffix += 1;
    } catch {
      return path.join(SAVED_DIR, candidate);
    }
  }
}

export function cvApiPlugin(): Plugin {
  return {
    name: 'cv-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/cv')) {
          next();
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
          const { pathname } = url;

          if (req.method === 'GET' && pathname === '/api/cv/library') {
            const source = parseDataSource(url.searchParams.get('source'));
            const bases = await listBaseVersions(source);
            const saved = await listSavedVersions(source);
            sendJson(res, 200, {
              source,
              bases: bases.map((version) => ({
                ...version,
                kind: 'base',
              })),
              compareBaseId: COMPARE_BASE_ID,
              saved: saved.map((version) => ({
                ...version,
                kind: 'saved',
              })),
            });
            return;
          }

          if (req.method === 'POST' && pathname === '/api/cv/saved') {
            await ensureSavedDir();
            const body = JSON.parse(await readBody(req)) as {
              label: string;
              sourceId: string;
              notes?: string;
            };

            const source = await findLocalVersion(body.sourceId);

            if (!source) {
              sendJson(res, 404, { error: 'Source CV not found.' });
              return;
            }

            const id = slugify(body.label);
            const now = new Date().toISOString();
            const nextVersion: CvVersionFile = {
              ...stripVersionMeta(source),
              id,
              label: body.label,
              notes: body.notes ?? source.notes,
              createdAt: now,
              updatedAt: now,
            };

            const filePath = await uniqueSavedPath(id);
            await writeYamlFile(filePath, nextVersion);
            sendJson(res, 201, {
              ...nextVersion,
              kind: 'saved',
            });
            return;
          }

          if (req.method === 'PUT' && pathname.startsWith('/api/cv/version/')) {
            const id = pathname.replace('/api/cv/version/', '');

            if (!id) {
              sendJson(res, 400, { error: 'Missing version id.' });
              return;
            }

            const resolved = await resolveLocalVersionPath(id);

            if (!resolved) {
              sendJson(res, 404, { error: 'Version not found.' });
              return;
            }

            const existing = await readYamlFile<CvVersionFile>(resolved.filePath);
            const body = JSON.parse(await readBody(req)) as Partial<CvVersionFile>;
            const nextVersion: CvVersionFile = {
              ...existing,
              ...stripVersionMeta({
                ...existing,
                ...body,
                extends: 'master',
              }),
              id: existing.id,
              label: typeof body.label === 'string' && body.label.trim()
                ? body.label.trim()
                : existing.label,
              createdAt: existing.createdAt,
              updatedAt: new Date().toISOString(),
            };

            await writeYamlFile(resolved.filePath, nextVersion);
            sendJson(res, 200, {
              ...nextVersion,
              kind: resolved.kind,
            });
            return;
          }

          if (req.method === 'POST' && pathname === '/api/cv/base') {
            const body = JSON.parse(await readBody(req)) as {
              sourceId: string;
              targetBaseId: string;
            };

            if (!body.targetBaseId || !isBaseProfileId(body.targetBaseId)) {
              sendJson(res, 400, {
                error: 'targetBaseId must be frontend-cv, data-engineer-cv, or fullstack-cv.',
              });
              return;
            }

            const source = await findLocalVersion(body.sourceId);

            if (!source) {
              sendJson(res, 404, { error: 'Source CV not found.' });
              return;
            }

            const existingTarget = (await listBaseVersions('local')).find(
              (entry) => entry.id === body.targetBaseId,
            );
            const defaultLabels: Record<string, string> = {
              'frontend-cv': 'Frontend CV',
              'data-engineer-cv': 'Data Engineer / Analyst CV',
              'fullstack-cv': 'Full-Stack & AI CV',
            };
            const nextBase: CvVersionFile = {
              ...stripVersionMeta(source),
              id: body.targetBaseId,
              label: existingTarget?.label ?? defaultLabels[body.targetBaseId] ?? body.targetBaseId,
              updatedAt: new Date().toISOString(),
            };

            await ensureBasesDir();
            await writeYamlFile(getBaseFilePath(body.targetBaseId), nextBase);
            sendJson(res, 200, {
              ...nextBase,
              kind: 'base',
            });
            return;
          }

          if (req.method === 'DELETE' && pathname.startsWith('/api/cv/saved/')) {
            const id = pathname.replace('/api/cv/saved/', '');

            if (!id) {
              sendJson(res, 400, { error: 'Missing saved CV id.' });
              return;
            }

            const filePath = path.join(SAVED_DIR, `${id}.yaml`);

            try {
              await fs.unlink(filePath);
            } catch {
              sendJson(res, 404, { error: 'Saved CV not found.' });
              return;
            }

            sendJson(res, 200, { ok: true });
            return;
          }

          sendJson(res, 404, { error: 'Route not found.' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}
