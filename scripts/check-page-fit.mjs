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

async function runCheck(baseUrl, id) {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({ headless: true });
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
      throw new Error('Page fit probe did not publish a result.');
    }

    if (result.error) {
      console.error(result.error);
      return 2;
    }

    const payload = {
      versionId: result.versionId,
      overflows: result.overflows,
      overflowPx: result.overflowPx,
      sparePx: result.sparePx ?? Math.max(0, result.clientHeight - result.scrollHeight),
      clientHeight: result.clientHeight,
      scrollHeight: result.scrollHeight,
    };

    console.log(JSON.stringify(payload));

    if (result.overflows) {
      console.error(
        `OVERFLOW: ${result.versionId} exceeds one A4 page by ~${Math.round(result.overflowPx)}px.`,
      );
      return 1;
    }

    if (payload.sparePx < 55) {
      console.error(
        `TOO TIGHT: ${result.versionId} has only ~${Math.round(payload.sparePx)}px spare (target 55-75px). ` +
          'Headless measurement under-reports vs the in-app preview by ~10-20px, so this risks real overflow. Shorten copy or hide a lower-priority bullet/project.',
      );
      return 1;
    }

    if (payload.sparePx > 75) {
      console.error(
        `TOO SPARSE: ${result.versionId} has ~${Math.round(payload.sparePx)}px spare (target 55-75px). ` +
          'The page looks under-filled. Add back a relevant bullet, project, or richer (still honest) wording.',
      );
      return 3;
    }

    console.error(
      `OK: ${result.versionId} fits one A4 page in the target band (~${Math.round(payload.sparePx)}px spare).`,
    );
    return 0;
  } finally {
    await browser.close();
  }
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
