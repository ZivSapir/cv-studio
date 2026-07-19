import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dump as stringifyYaml, load as parseYaml } from 'js-yaml';
import type { Plugin } from 'vite';

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
  experienceBulletOrder?: Record<string, string[]>;
  projectOrder?: string[];
  skillCategoryOrder?: string[];
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BASE_PATH = path.join(DATA_DIR, 'base.yaml');
const SAVED_DIR = path.join(DATA_DIR, 'saved');

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cv';
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

async function listSavedVersions(): Promise<CvVersionFile[]> {
  await ensureSavedDir();
  const entries = await fs.readdir(SAVED_DIR);
  const versions: CvVersionFile[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.yaml')) {
      continue;
    }

    const version = await readYamlFile<CvVersionFile>(path.join(SAVED_DIR, entry));
    versions.push(version);
  }

  return versions.sort((left, right) => left.label.localeCompare(right.label));
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
    experienceBulletOrder: version.experienceBulletOrder,
    projectOrder: version.projectOrder,
    skillCategoryOrder: version.skillCategoryOrder,
  };
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
            const base = await readYamlFile<CvVersionFile>(BASE_PATH);
            const saved = await listSavedVersions();
            sendJson(res, 200, {
              base: {
                ...base,
                kind: 'base',
              },
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

            const saved = await listSavedVersions();
            const base = await readYamlFile<CvVersionFile>(BASE_PATH);
            const source = body.sourceId === 'base'
              ? base
              : saved.find((entry) => entry.id === body.sourceId);

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

          if (req.method === 'POST' && pathname === '/api/cv/base') {
            const body = JSON.parse(await readBody(req)) as {
              sourceId: string;
            };

            const saved = await listSavedVersions();
            const source = body.sourceId === 'base'
              ? await readYamlFile<CvVersionFile>(BASE_PATH)
              : saved.find((entry) => entry.id === body.sourceId);

            if (!source) {
              sendJson(res, 404, { error: 'Source CV not found.' });
              return;
            }

            const nextBase: CvVersionFile = {
              ...stripVersionMeta(source),
              id: 'base',
              label: 'Base CV',
              updatedAt: new Date().toISOString(),
            };

            await writeYamlFile(BASE_PATH, nextBase);
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
