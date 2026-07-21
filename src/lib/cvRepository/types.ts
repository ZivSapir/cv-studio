import type {
  CvLibrary,
  CvMaster,
  CvVersion,
  PromoteToBaseTarget,
} from '../../types/cv';
import type { CvDataSource } from '../loadCvData';

export type CvBackendKind = 'file' | 'browser';

export type CvBackup = {
  version: 1;
  exportedAt: string;
  master: CvMaster;
  bases: CvVersion[];
  saved: CvVersion[];
};

export type CvRepository = {
  kind: CvBackendKind;
  loadMaster: (source: CvDataSource) => Promise<CvMaster>;
  loadLibrary: (source: CvDataSource) => Promise<CvLibrary>;
  saveMaster: (master: CvMaster) => Promise<void>;
  saveCopy: (
    label: string,
    sourceId: string,
    notes?: string,
  ) => Promise<CvVersion>;
  updateVersion: (version: CvVersion) => Promise<CvVersion>;
  promoteToBase: (
    sourceId: string,
    target: PromoteToBaseTarget,
  ) => Promise<CvVersion>;
  deleteSaved: (id: string) => Promise<void>;
  exportBackup: () => Promise<CvBackup>;
  importBackup: (backup: CvBackup) => Promise<void>;
  importMaster: (master: CvMaster) => Promise<void>;
  importSavedVersion: (version: CvVersion) => Promise<CvVersion>;
  resetToExamples: () => Promise<void>;
};
