import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'data');
const basesDir = path.join(dataDir, 'bases');
const savedDir = path.join(dataDir, 'saved');
const backupsDir = path.join(dataDir, 'backups');

function readYamlFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseYaml(raw);
}

function listYamlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') && !name.endsWith('.example.yaml'))
    .map((name) => path.join(dir, name));
}

const masterPath = path.join(dataDir, 'master.yaml');
if (!fs.existsSync(masterPath)) {
  console.error('Missing data/master.yaml - run npm run setup first.');
  process.exit(1);
}

const master = readYamlFile(masterPath);
const bases = listYamlFiles(basesDir).map((filePath) => {
  const version = readYamlFile(filePath);
  return { ...version, kind: 'base' };
});
const saved = listYamlFiles(savedDir).map((filePath) => {
  const version = readYamlFile(filePath);
  return { ...version, kind: 'saved' };
});

const exportedAt = new Date().toISOString();
const stamp = exportedAt.slice(0, 10);
const backup = {
  version: 1,
  exportedAt,
  master,
  bases,
  saved,
};

fs.mkdirSync(backupsDir, { recursive: true });
const outPath = path.join(backupsDir, `cv-studio-backup-${stamp}.json`);
fs.writeFileSync(outPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

const latestPath = path.join(backupsDir, 'cv-studio-backup-latest.json');
fs.writeFileSync(latestPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

console.log(`Wrote ${path.relative(rootDir, outPath)}`);
console.log(`Wrote ${path.relative(rootDir, latestPath)}`);
console.log(
  `master + ${bases.length} base(s) + ${saved.length} saved version(s)`,
);
