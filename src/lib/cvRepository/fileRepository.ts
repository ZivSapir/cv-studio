import type {
  CvMaster,
  CvVersion,
  PromoteToBaseTarget,
} from '../../types/cv';
import {
  deleteSavedCv,
  fetchCvLibrary,
  promoteCvToBase,
  saveCvCopy,
  updateCvVersion,
} from '../cvApi';
import type { CvDataSource } from '../loadCvData';
import { getExampleMaster } from './seedData';
import type { CvBackup, CvRepository } from './types';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? 'Request failed.');
  }

  return response.json() as Promise<T>;
}

export function createFileRepository(): CvRepository {
  return {
    kind: 'file',

    async loadMaster(source: CvDataSource) {
      if (source === 'example') {
        return getExampleMaster();
      }

      const response = await fetch('/api/cv/master');
      return parseJsonResponse<CvMaster>(response);
    },

    async loadLibrary(source: CvDataSource) {
      return fetchCvLibrary(source);
    },

    async saveMaster(master: CvMaster) {
      const response = await fetch('/api/cv/master', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(master),
      });
      await parseJsonResponse<{ ok: true }>(response);
    },

    async saveCopy(label, sourceId, notes) {
      return saveCvCopy(label, sourceId, notes);
    },

    async updateVersion(version) {
      return updateCvVersion(version.id, version);
    },

    async promoteToBase(sourceId, target: PromoteToBaseTarget) {
      return promoteCvToBase(sourceId, target);
    },

    async deleteSaved(id) {
      await deleteSavedCv(id);
    },

    async exportBackup(): Promise<CvBackup> {
      const [master, library] = await Promise.all([
        this.loadMaster('local'),
        fetchCvLibrary('local'),
      ]);

      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        master,
        bases: library.bases,
        saved: library.saved,
      };
    },

    async importBackup(backup) {
      if (backup.version !== 1 || !backup.master) {
        throw new Error('Invalid backup file.');
      }

      await this.saveMaster(backup.master);

      for (const base of backup.bases ?? []) {
        await updateCvVersion(base.id, {
          ...base,
          kind: 'base',
        });
      }

      for (const saved of backup.saved ?? []) {
        await this.importSavedVersion(saved);
      }
    },

    async importMaster(master) {
      await this.saveMaster(master);
    },

    async importSavedVersion(version) {
      const response = await fetch('/api/cv/saved/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(version),
      });
      return parseJsonResponse<CvVersion>(response);
    },

    async resetToExamples() {
      throw new Error('Reset to examples is only available in browser mode.');
    },
  };
}
