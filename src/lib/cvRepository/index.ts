import { createBrowserRepository } from './browserRepository';
import { createFileRepository } from './fileRepository';
import type { CvBackendKind, CvRepository } from './types';

let repositoryPromise: Promise<CvRepository> | null = null;

async function detectRepository(): Promise<CvRepository> {
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/api/cv/library?source=example');
      if (response.ok) {
        return createFileRepository();
      }
    } catch {
      // fall through to browser backend
    }
  }

  return createBrowserRepository();
}

export function getCvRepository(): Promise<CvRepository> {
  if (!repositoryPromise) {
    repositoryPromise = detectRepository();
  }

  return repositoryPromise;
}

export async function getCvBackendKind(): Promise<CvBackendKind> {
  const repository = await getCvRepository();
  return repository.kind;
}

export type { CvBackup, CvBackendKind, CvRepository } from './types';
