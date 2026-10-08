import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const latest = path.join(rootDir, 'data', 'backups', 'cv-studio-backup-latest.json');

const backup = spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'export-local-backup.mjs')], {
  stdio: 'inherit',
});
if (backup.status !== 0) {
  process.exit(backup.status ?? 1);
}

const reveal =
  process.platform === 'darwin'
    ? ['open', ['-R', latest]]
    : process.platform === 'win32'
      ? ['explorer', [`/select,${latest}`]]
      : ['xdg-open', [path.dirname(latest)]];
spawnSync(reveal[0], reveal[1], { stdio: 'ignore' });

console.log('\nNext: on the hosted site, click "Import backup" and choose cv-studio-backup-latest.json.');
