import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const copies = [
  ['data/master.example.yaml', 'data/master.yaml'],
  ['data/bases/frontend-cv.example.yaml', 'data/bases/frontend-cv.yaml'],
  ['data/bases/data-engineer-cv.example.yaml', 'data/bases/data-engineer-cv.yaml'],
  ['data/bases/fullstack-cv.example.yaml', 'data/bases/fullstack-cv.yaml'],
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

const savedExampleSource = path.join(rootDir, 'data/saved/example-tailored.example.yaml');
const savedExampleTarget = path.join(rootDir, 'data/saved/example-tailored.yaml');

if (!fs.existsSync(savedExampleTarget)) {
  fs.copyFileSync(savedExampleSource, savedExampleTarget);
  console.log('created data/saved/example-tailored.yaml');
} else {
  console.log('skip data/saved/example-tailored.yaml (already exists)');
}

console.log('Done. Run npm run dev to preview.');
