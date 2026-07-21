import type {
  CvLibrary,
  CvMaster,
  CvVersion,
  PromoteToBaseTarget,
} from '../../types/cv';
import type { CvDataSource } from '../loadCvData';
import { resolveCompareBaseId } from './baseUtils';
import {
  getExampleBases,
  getExampleMaster,
  getExampleSaved,
} from './seedData';
import { readWorkspace, writeWorkspace } from './browserStore';
import {
  createExampleWorkspace,
  CURRENT_SEED_VERSION,
  shouldMigrateExampleSeed,
} from './seedMigration';
import type { CvBackup, CvRepository } from './types';
import {
  createUniqueBaseId,
  createUniqueSavedId,
  stripVersionForCopy,
} from './versionUtils';

async function ensureWorkspace() {
  const existing = await readWorkspace();

  if (!existing) {
    const seeded = createExampleWorkspace();
    await writeWorkspace(seeded);
    return seeded;
  }

  if (shouldMigrateExampleSeed(existing)) {
    const seeded = createExampleWorkspace();
    await writeWorkspace(seeded);
    return seeded;
  }

  return existing;
}

function findVersion(
  workspace: Awaited<ReturnType<typeof ensureWorkspace>>,
  sourceId: string,
): CvVersion | undefined {
  return (
    workspace.bases.find((entry) => entry.id === sourceId)
    ?? workspace.saved.find((entry) => entry.id === sourceId)
  );
}

export function createBrowserRepository(): CvRepository {
  return {
    kind: 'browser',

    async loadMaster(source: CvDataSource) {
      if (source === 'example') {
        return getExampleMaster();
      }

      const workspace = await ensureWorkspace();
      return workspace.master;
    },

    async loadLibrary(source: CvDataSource): Promise<CvLibrary> {
      if (source === 'example') {
        const bases = getExampleBases();
        return {
          bases,
          compareBaseId: resolveCompareBaseId(bases),
          saved: getExampleSaved(),
        };
      }

      const workspace = await ensureWorkspace();
      const bases = workspace.bases.map((version) => ({
        ...version,
        kind: 'base' as const,
      }));

      return {
        bases,
        compareBaseId: resolveCompareBaseId(bases),
        saved: workspace.saved.map((version) => ({
          ...version,
          kind: 'saved' as const,
        })),
      };
    },

    async saveMaster(master: CvMaster) {
      const workspace = await ensureWorkspace();
      await writeWorkspace({
        ...workspace,
        master,
      });
    },

    async saveCopy(label, sourceId, notes) {
      const workspace = await ensureWorkspace();
      const source = findVersion(workspace, sourceId);

      if (!source) {
        throw new Error('Source CV not found.');
      }

      const id = createUniqueSavedId(
        label,
        workspace.saved.map((entry) => entry.id),
      );
      const now = new Date().toISOString();
      const nextVersion: CvVersion = {
        ...stripVersionForCopy(source),
        id,
        label,
        notes: notes ?? source.notes,
        kind: 'saved',
        createdAt: now,
        updatedAt: now,
      };

      await writeWorkspace({
        ...workspace,
        saved: [...workspace.saved, nextVersion],
      });

      return nextVersion;
    },

    async updateVersion(version) {
      const workspace = await ensureWorkspace();
      const now = new Date().toISOString();
      const nextVersion: CvVersion = {
        ...version,
        updatedAt: now,
      };

      const baseIndex = workspace.bases.findIndex((entry) => entry.id === version.id);
      if (baseIndex !== -1) {
        const bases = [...workspace.bases];
        bases[baseIndex] = {
          ...nextVersion,
          kind: 'base',
        };
        await writeWorkspace({
          ...workspace,
          bases,
        });
        return bases[baseIndex];
      }

      const savedIndex = workspace.saved.findIndex((entry) => entry.id === version.id);
      if (savedIndex === -1) {
        throw new Error('Version not found.');
      }

      const saved = [...workspace.saved];
      saved[savedIndex] = {
        ...nextVersion,
        kind: 'saved',
      };
      await writeWorkspace({
        ...workspace,
        saved,
      });
      return saved[savedIndex];
    },

    async promoteToBase(sourceId, target: PromoteToBaseTarget) {
      const workspace = await ensureWorkspace();
      const source = findVersion(workspace, sourceId);

      if (!source) {
        throw new Error('Source CV not found.');
      }

      if (target.mode === 'create') {
        const label = target.label.trim();
        if (!label) {
          throw new Error('Base label is required.');
        }

        const id = createUniqueBaseId(
          label,
          workspace.bases.map((entry) => entry.id),
        );
        const nextBase: CvVersion = {
          ...stripVersionForCopy(source),
          id,
          label,
          kind: 'base',
          updatedAt: new Date().toISOString(),
        };

        await writeWorkspace({
          ...workspace,
          bases: [...workspace.bases, nextBase],
        });

        return nextBase;
      }

      const existing = workspace.bases.find((entry) => entry.id === target.targetBaseId);
      if (!existing) {
        throw new Error('Target base not found.');
      }

      const nextBase: CvVersion = {
        ...stripVersionForCopy(source),
        id: target.targetBaseId,
        label: existing.label,
        kind: 'base',
        updatedAt: new Date().toISOString(),
      };

      const bases = workspace.bases.map((entry) => (
        entry.id === target.targetBaseId ? nextBase : entry
      ));

      await writeWorkspace({
        ...workspace,
        bases,
      });

      return nextBase;
    },

    async deleteSaved(id) {
      const workspace = await ensureWorkspace();
      const nextSaved = workspace.saved.filter((entry) => entry.id !== id);

      if (nextSaved.length === workspace.saved.length) {
        throw new Error('Saved CV not found.');
      }

      await writeWorkspace({
        ...workspace,
        saved: nextSaved,
      });
    },

    async exportBackup(): Promise<CvBackup> {
      const workspace = await ensureWorkspace();
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        master: workspace.master,
        bases: workspace.bases,
        saved: workspace.saved,
      };
    },

    async importBackup(backup) {
      if (backup.version !== 1 || !backup.master || !Array.isArray(backup.bases)) {
        throw new Error('Invalid backup file.');
      }

      await writeWorkspace({
        seedVersion: CURRENT_SEED_VERSION,
        master: backup.master,
        bases: backup.bases.map((version) => ({
          ...version,
          kind: 'base',
        })),
        saved: (backup.saved ?? []).map((version) => ({
          ...version,
          kind: 'saved',
        })),
      });
    },

    async importMaster(master) {
      const workspace = await ensureWorkspace();
      await writeWorkspace({
        ...workspace,
        master,
      });
    },

    async importSavedVersion(version) {
      const workspace = await ensureWorkspace();
      const id = createUniqueSavedId(
        version.label || version.id || 'tailored',
        workspace.saved.map((entry) => entry.id),
      );
      const now = new Date().toISOString();
      const nextVersion: CvVersion = {
        ...stripVersionForCopy(version),
        id,
        label: version.label || id,
        kind: 'saved',
        createdAt: now,
        updatedAt: now,
        extends: 'master',
      };

      await writeWorkspace({
        ...workspace,
        saved: [...workspace.saved, nextVersion],
      });

      return nextVersion;
    },

    async resetToExamples() {
      await writeWorkspace(createExampleWorkspace());
    },
  };
}
