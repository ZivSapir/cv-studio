import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const copies = [
  ['data/master.example.yaml', 'data/master.yaml'],
  ['data/bases/main-cv.example.yaml', 'data/bases/main-cv.yaml'],
];

for (const [from, to] of copies) {
  const sourcePath = path.join(rootDir, from);
  const targetPath = path.join(rootDir, to);

  if (fs.existsSync(targetPath)) {
    console.log(`skip ${to} (already exists)`);
    continue;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`created ${to}`);
}

console.log('Done. Run npm run dev to preview.');
console.log('Tip: edit data/master.yaml with your real CV, then open the folder in Cursor to tailor job-specific versions.');
