import { useCallback, useEffect, useState } from 'react';
import {
  deleteSavedCv,
  fetchCvLibrary,
  promoteCvToBase,
  saveCvCopy,
  updateCvVersion,
} from '../lib/cvApi';
import type { CvDataSource } from '../lib/loadCvData';
import type {
  CvBaseProfileId,
  CvLibrary,
  CvVersion,
} from '../types/cv';

type UseCvLibraryResult = {
  library: CvLibrary | null;
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
    targetBaseId: CvBaseProfileId,
  ) => Promise<CvVersion>;
  removeSaved: (id: string) => Promise<void>;
};

export function useCvLibrary(source: CvDataSource): UseCvLibraryResult {
  const [library, setLibrary] = useState<CvLibrary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextLibrary = await fetchCvLibrary(source);
      setLibrary(nextLibrary);
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

  const saveCopy = useCallback(async (
    label: string,
    sourceId: string,
    notes?: string,
  ) => {
    const savedVersion = await saveCvCopy(label, sourceId, notes);
    await reloadLibrary();
    return savedVersion;
  }, [reloadLibrary]);

  const updateVersion = useCallback(async (version: CvVersion) => {
    const savedVersion = await updateCvVersion(version.id, version);
    await reloadLibrary();
    return savedVersion;
  }, [reloadLibrary]);

  const setAsBase = useCallback(async (
    sourceId: string,
    targetBaseId: CvBaseProfileId,
  ) => {
    const baseVersion = await promoteCvToBase(sourceId, targetBaseId);
    await reloadLibrary();
    return baseVersion;
  }, [reloadLibrary]);

  const removeSaved = useCallback(async (id: string) => {
    await deleteSavedCv(id);
    await reloadLibrary();
  }, [reloadLibrary]);

  return {
    library,
    isLoading,
    error,
    reloadLibrary,
    saveCopy,
    updateVersion,
    setAsBase,
    removeSaved,
  };
}
