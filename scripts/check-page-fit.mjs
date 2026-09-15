#!/usr/bin/env node
/**
 * Measure whether a CV version overflows one A4 page (PageFitApp / `?pageFit=` probe).
 * In-app preview uses the same `measureCvPageFit` helper after fonts settle (see App.tsx).
 *
 * Usage: npm run check-page-fit -- <version-id>
 * Requires: dev server on CV_STUDIO_URL (default http://127.0.0.1:5173), or script will start one.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const versionId = process.argv[2];

if (!versionId) {
  console.error('Usage: npm run check-page-fit -- <version-id>');
  process.exit(2);
}

async function waitForServer(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/cv/library`);

      if (response.ok) {
        return true;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return false;
}

async function ensureDevServer(baseUrl) {
  if (await waitForServer(baseUrl, 2000)) {
    return { baseUrl, child: null };
  }

  const port = new URL(baseUrl).port || '5173';
  const child = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port],
    {
      cwd: repoRoot,
      stdio: 'ignore',
      env: { ...process.env, BROWSER: 'none' },
      detached: process.platform !== 'win32',
    },
  );

  const ready = await waitForServer(baseUrl, 45000);

  if (!ready) {
    killProcessTree(child);
    throw new Error(`Dev server did not start at ${baseUrl} within 45s.`);
  }

  return { baseUrl, child };
}

function killProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      child.kill();
      return;
    }

    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill();
    } catch {
      // already gone
    }
  }
}

// Chromium and WebKit lay out the same CSS (Montserrat + fallbacks) at measurably different
// heights - WebKit reliably renders taller. A Chromium-only check can report ~85px spare while
// WebKit (Safari's engine, the macOS default) overflows the same document. Measure both and let
// the worse one decide; only fall back to Chromium-only if WebKit isn't installed.
const ENGINES = ['chromium', 'webkit'];

async function measureWithEngine(engineName, baseUrl, id) {
  const playwright = await import('playwright');
  const engine = playwright[engineName];

  let browser;
  try {
    browser = await engine.launch({ headless: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist")) {
      return { engine: engineName, skipped: true };
    }
    throw error;
  }

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  try {
    const url = `${baseUrl}/?pageFit=${encodeURIComponent(id)}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForFunction(
      () => {
        const fit = window.__CV_PAGE_FIT__;
        return fit?.ready === true;
      },
      { timeout: 20000 },
    );

    const result = await page.evaluate(() => window.__CV_PAGE_FIT__);

    if (!result) {
      throw new Error(`Page fit probe did not publish a result (${engineName}).`);
    }

    if (result.error) {
      return { engine: engineName, error: result.error };
    }

    return {
      engine: engineName,
      versionId: result.versionId,
      overflows: result.overflows,
      overflowPx: result.overflowPx,
      sparePx: result.sparePx ?? Math.max(0, result.clientHeight - result.scrollHeight),
      clientHeight: result.clientHeight,
      scrollHeight: result.scrollHeight,
    };
  } finally {
    await browser.close();
  }
}

async function runCheck(baseUrl, id) {
  const measurements = [];

  for (const engineName of ENGINES) {
    const measurement = await measureWithEngine(engineName, baseUrl, id);

    if (measurement.error) {
      console.error(measurement.error);
      return 2;
    }

    if (measurement.skipped) {
      console.error(`(${engineName} not installed - run \`npx playwright install ${engineName}\` for a cross-engine check; skipping)`);
      continue;
    }

    console.log(JSON.stringify(measurement));
    measurements.push(measurement);
  }

  if (measurements.length === 0) {
    console.error('No browser engines available to measure page fit.');
    return 2;
  }

  // The worse (most overflowing / least spare) engine decides the verdict.
  const worst = measurements.reduce((a, b) => (a.sparePx <= b.sparePx ? a : b));
  const versionId = worst.versionId;

  if (worst.overflows) {
    console.error(
      `OVERFLOW: ${versionId} exceeds one A4 page by ~${Math.round(worst.overflowPx)}px in ${worst.engine}.`,
    );
    return 1;
  }

  if (worst.sparePx < 40) {
    console.error(
      `TOO TIGHT: ${versionId} has only ~${Math.round(worst.sparePx)}px spare in ${worst.engine} (target 40-100px). ` +
        'This risks real overflow in some browsers. Shorten copy or hide a lower-priority bullet/project.',
    );
    return 1;
  }

  if (worst.sparePx > 100) {
    console.error(
      `TOO SPARSE: ${versionId} has ~${Math.round(worst.sparePx)}px spare in ${worst.engine} (target 40-100px). ` +
        'The page looks under-filled. Add back a relevant bullet, project, or richer (still honest) wording.',
    );
    return 3;
  }

  console.error(
    `OK: ${versionId} fits one A4 page in the target band in every measured engine (worst case ~${Math.round(worst.sparePx)}px spare, ${worst.engine}).`,
  );
  return 0;
}

let devChild = null;
let exitCode = 0;

try {
  const baseUrl = process.env.CV_STUDIO_URL ?? 'http://127.0.0.1:5173';
  const { child } = await ensureDevServer(baseUrl);
  devChild = child;
  exitCode = await runCheck(baseUrl, versionId);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);

  if (message.includes('Executable doesn\'t exist') || message.includes('playwright')) {
    console.error('Install browser tooling once: npm install && npx playwright install chromium');
  }

  exitCode = 2;
} finally {
  killProcessTree(devChild);
}

process.exit(exitCode);
