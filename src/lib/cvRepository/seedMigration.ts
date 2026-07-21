import type { CvMaster, CvVersion } from '../../types/cv';
import {
  getExampleBases,
  getExampleMaster,
  getExampleSaved,
} from './seedData';

export const CURRENT_SEED_VERSION = 2;

const LEGACY_EXAMPLE_BASE_IDS = [
  'frontend-cv',
  'data-engineer-cv',
  'fullstack-cv',
];

export type BrowserWorkspace = {
  seedVersion?: number;
  master: CvMaster;
  bases: CvVersion[];
  saved: CvVersion[];
};

export function isExamplePlaceholderMaster(master: CvMaster): boolean {
  return master.name.trim() === 'Your Name';
}

export function hasLegacyExampleBases(bases: CvVersion[]): boolean {
  const baseIds = new Set(bases.map((base) => base.id));
  return LEGACY_EXAMPLE_BASE_IDS.every((id) => baseIds.has(id));
}

export function shouldMigrateExampleSeed(workspace: BrowserWorkspace): boolean {
  const seedVersion = workspace.seedVersion ?? 1;

  if (seedVersion >= CURRENT_SEED_VERSION) {
    return false;
  }

  // Only reset untouched example seed — not imported real CVs that happen to reuse base ids.
  return isExamplePlaceholderMaster(workspace.master);
}

export function createExampleWorkspace(): BrowserWorkspace {
  return {
    seedVersion: CURRENT_SEED_VERSION,
    master: getExampleMaster(),
    bases: getExampleBases(),
    saved: getExampleSaved(),
  };
}
