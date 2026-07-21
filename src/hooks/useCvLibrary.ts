import { useCallback, useEffect, useState } from 'react';
import {
  getCvBackendKind,
  getCvRepository,
  type CvBackup,
  type CvBackendKind,
} from '../lib/cvRepository';
import type { CvDataSource } from '../lib/loadCvData';
import type {
  CvLibrary,
  CvMaster,
  CvVersion,
  PromoteToBaseTarget,
} from '../types/cv';

type UseCvLibraryResult = {
  backendKind: CvBackendKind | null;
  library: CvLibrary | null;
  master: CvMaster | null;
  isLoading: boolean;
  error: string | null;
  reloadLibrary: () => Promise<void>;
  saveCopy: (
    label: string,
    sourceId: string,
    notes?: string,
  ) => Promise<CvVersion>;
  updateVersion: (version: CvVersion) => Promise<CvVersion>;
  setAsBase: (
    sourceId: string,
    target: PromoteToBaseTarget,
  ) => Promise<CvVersion>;
  removeSaved: (id: string) => Promise<void>;
  exportBackup: () => Promise<CvBackup>;
  importBackup: (backup: CvBackup) => Promise<void>;
  importMaster: (master: CvMaster) => Promise<void>;
  importSavedVersion: (version: CvVersion) => Promise<CvVersion>;
  resetToExamples: () => Promise<void>;
};

export function useCvLibrary(source: CvDataSource): UseCvLibraryResult {
  const [backendKind, setBackendKind] = useState<CvBackendKind | null>(null);
  const [library, setLibrary] = useState<CvLibrary | null>(null);
  const [master, setMaster] = useState<CvMaster | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const repository = await getCvRepository();
      setBackendKind(repository.kind);
      const [nextLibrary, nextMaster] = await Promise.all([
        repository.loadLibrary(source),
        repository.loadMaster(source),
      ]);
      setLibrary(nextLibrary);
      setMaster(nextMaster);
    } catch (loadError) {
      const message = loadError instanceof Error
        ? loadError.message
        : 'Failed to load CV library.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [source]);

  useEffect(() => {
    void reloadLibrary();
  }, [reloadLibrary]);

  useEffect(() => {
    void getCvBackendKind().then(setBackendKind);
  }, []);

  const saveCopy = useCallback(async (
    label: string,
    sourceId: string,
    notes?: string,
  ) => {
    const repository = await getCvRepository();
    const savedVersion = await repository.saveCopy(label, sourceId, notes);
    await reloadLibrary();
    return savedVersion;
  }, [reloadLibrary]);

  const updateVersion = useCallback(async (version: CvVersion) => {
    const repository = await getCvRepository();
    const savedVersion = await repository.updateVersion(version);
    await reloadLibrary();
    return savedVersion;
  }, [reloadLibrary]);

  const setAsBase = useCallback(async (
    sourceId: string,
    target: PromoteToBaseTarget,
  ) => {
    const repository = await getCvRepository();
    const baseVersion = await repository.promoteToBase(sourceId, target);
    await reloadLibrary();
    return baseVersion;
  }, [reloadLibrary]);

  const removeSaved = useCallback(async (id: string) => {
    const repository = await getCvRepository();
    await repository.deleteSaved(id);
    await reloadLibrary();
  }, [reloadLibrary]);

  const exportBackup = useCallback(async () => {
    const repository = await getCvRepository();
    return repository.exportBackup();
  }, []);

  const importBackup = useCallback(async (backup: CvBackup) => {
    const repository = await getCvRepository();
    await repository.importBackup(backup);
    await reloadLibrary();
  }, [reloadLibrary]);

  const importMaster = useCallback(async (nextMaster: CvMaster) => {
    const repository = await getCvRepository();
    await repository.importMaster(nextMaster);
    await reloadLibrary();
  }, [reloadLibrary]);

  const importSavedVersion = useCallback(async (version: CvVersion) => {
    const repository = await getCvRepository();
    const saved = await repository.importSavedVersion(version);
    await reloadLibrary();
    return saved;
  }, [reloadLibrary]);

  const resetToExamples = useCallback(async () => {
    const repository = await getCvRepository();
    await repository.resetToExamples();
    await reloadLibrary();
  }, [reloadLibrary]);

  return {
    backendKind,
    library,
    master,
    isLoading,
    error,
    reloadLibrary,
    saveCopy,
    updateVersion,
    setAsBase,
    removeSaved,
    exportBackup,
    importBackup,
    importMaster,
    importSavedVersion,
    resetToExamples,
  };
}
